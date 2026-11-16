'use strict';

const fs = require('fs').promises;
const path = require('path');

module.exports = ({ strapi }) => ({
  async processTemplate(file) {
    try {
      const fileExt = path.extname(file.name).toLowerCase();
      const fileBuffer = await fs.readFile(file.path);
      
      let html = '', text = '', metadata = {
        file_type: fileExt.replace('.', ''),
        file_name: file.name,
        file_size: file.size,
        processed_at: new Date().toISOString(),
      };

      switch (fileExt) {
        case '.docx':
          const docx = await this.processDocx(fileBuffer);
          html = docx.html; text = docx.text;
          metadata.conversion_method = 'mammoth'; break;
        case '.pdf':
          const pdf = await this.processPdf(fileBuffer);
          html = pdf.html; text = pdf.text;
          metadata.conversion_method = 'pdf-parse';
          metadata.page_count = pdf.pageCount; break;
        case '.html': case '.htm':
          html = fileBuffer.toString('utf-8');
          text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          metadata.conversion_method = 'direct'; break;
        default:
          throw new Error(`Unsupported: ${fileExt}. Use: .docx, .pdf, .html`);
      }

      const sanitized = this.sanitizeHtml(html);
      const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
      
      return {
        success: true,
        html_content: sanitized,
        extracted_text: text,
        metadata: { ...metadata, word_count: wordCount, character_count: text.length },
      };
    } catch (error) {
      strapi.log.error(`Processing failed: ${error.message}`);
      return { success: false, error: error.message, html_content: '', extracted_text: '', metadata: {} };
    }
  },

  async processDocx(buffer) {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.convertToHtml({ buffer });
      return {
        html: result.value,
        text: result.value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
      };
    } catch (error) {
      strapi.log.warn(`DOCX fallback: ${error.message}`);
      return { html: '<p>DOCX conversion failed</p>', text: 'DOCX conversion failed' };
    }
  },

  async processPdf(buffer) {
    try {
      const pdf = require('pdf-parse');
      const data = await pdf(buffer);
      const paragraphs = data.text.split('\n\n')
        .filter(p => p.trim().length > 0)
        .map(p => `<p>${p.trim()}</p>`).join('\n');
      return { html: paragraphs, text: data.text, pageCount: data.numpages };
    } catch (error) {
      strapi.log.warn(`PDF fallback: ${error.message}`);
      return { html: '<p>PDF extraction failed</p>', text: 'PDF extraction failed', pageCount: 0 };
    }
  },

  sanitizeHtml(html) {
    let sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '').replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '');
    if (!sanitized.includes('<html>')) {
      sanitized = `<div class="letter-template">${sanitized}</div>`;
    }
    return sanitized;
  },
});