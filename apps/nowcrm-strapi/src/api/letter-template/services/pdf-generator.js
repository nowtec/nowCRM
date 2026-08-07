'use strict';

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

module.exports = ({ strapi }) => ({
  async generatePdf(htmlContent, options = {}) {
    try {
      const pdf = require('html-pdf');
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'letter-pdf-'));
      const outputPath = path.join(tempDir, `letter-${Date.now()}.pdf`);
      const defaultOptions = {
        format: options.paper_size || 'A4',
        orientation: options.orientation || 'portrait',
        border: this.getBorderOptions(options.margins),
        type: 'pdf',
        quality: '100',
        timeout: 30000,
      };
      return new Promise((resolve, reject) => {
        pdf.create(htmlContent, defaultOptions).toFile(outputPath, async (err, res) => {
          if (err) {
            await this.cleanupTempDir(tempDir);
            reject(new Error(`PDF failed: ${err.message}`));
          } else {
            const size = res.filename ? (await fs.stat(res.filename)).size : 0;
            resolve({ success: true, file_path: res.filename, file_size: size, pages: 1, temp_dir: tempDir });
          }
        });
      });
    } catch (error) {
      strapi.log.error(`PDF error: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  async generatePdfForTemplate(template, contactData = {}) {
    try {
      const tokenDetector = strapi.service('api::letter-template.token-detector');
      let html = template.html_preview;
      if (!html && template.template_file) {
        const processor = strapi.service('api::letter-template.template-processor');
        const file = { name: template.template_file.name, path: template.template_file.path || template.template_file.url, size: template.template_file.size };
        const result = await processor.processTemplate(file);
        if (result.success) html = result.html_content;
      }
      if (!html) throw new Error('No HTML content');
      const processed = tokenDetector.replaceTokensWithSample(html, { contact: contactData, text_block: template.text_blocks || {} });
      const styled = this.addPdfStyles(processed, template);
      const options = { paper_size: template.paper_size, orientation: template.orientation, margins: template.margins };
      return await this.generatePdf(styled, options);
    } catch (error) {
      strapi.log.error(`Template PDF failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  async generateBatchPdfs(template, contacts) {
    try {
      const results = [], tempDirs = [];
      for (const contact of contacts) {
        const result = await this.generatePdfForTemplate(template, contact);
        if (result.success) {
          results.push({ contact_id: contact.id || contact.email, success: true, file_path: result.file_path });
          if (result.temp_dir) tempDirs.push(result.temp_dir);
        } else {
          results.push({ contact_id: contact.id || contact.email, success: false, error: result.error });
        }
      }
      return {
        success: results.some(r => r.success),
        results,
        temp_dirs: tempDirs,
        total: contacts.length,
        successful: results.filter(r => r.success).length,
      };
    } catch (error) {
      strapi.log.error(`Batch PDF failed: ${error.message}`);
      return { success: false, error: error.message, results: [] };
    }
  },

  getBorderOptions(margins) {
    if (!margins) return '0.5in';
    const { top = 2.54, bottom = 2.54, left = 2.54, right = 2.54, unit = 'cm' } = margins;
    const toIn = (v, u) => u === 'cm' ? v / 2.54 : u === 'mm' ? v / 25.4 : u === 'in' ? v : v / 2.54;
    return { top: `${toIn(top, unit)}in`, bottom: `${toIn(bottom, unit)}in`, left: `${toIn(left, unit)}in`, right: `${toIn(right, unit)}in` };
  },

  addPdfStyles(html, template) {
    const m = template.margins || { top: 2.54, bottom: 2.54, left: 2.54, right: 2.54, unit: 'cm' };
    const u = m.unit || 'cm';
    const css = `<style>body{margin:0;padding:${m.top}${u} ${m.right}${u} ${m.bottom}${u} ${m.left}${u};font-family:'${template.default_font_family || 'Arial'}',sans-serif;font-size:${template.default_font_size || 12}pt;line-height:1.5}p{margin:0 0 1em 0;text-align:justify}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>`;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">${css}</head><body>${html}</body></html>`;
  },

  async cleanupTempDir(tempDir) {
    try { await fs.rm(tempDir, { recursive: true, force: true }); } 
    catch (error) { strapi.log.warn(`Cleanup failed: ${error.message}`); }
  },
});