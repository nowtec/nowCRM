'use strict';

/**
 * letter-template controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::letter-template.letter-template', ({ strapi }) => ({
  /**
   * Custom endpoint for template upload with validation
   */
  async upload(ctx) {
    try {
      const { files, data } = ctx.request;
      
      if (!files || !files.template_file) {
        return ctx.badRequest('Template file is required');
      }

      // Validate file type
      const allowedTypes = ['.docx', '.pdf', '.html', '.htm'];
      const fileExt = files.template_file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(`.${fileExt}`)) {
        return ctx.badRequest('Invalid file type. Allowed: DOCX, PDF, HTML');
      }

      // Process template file
      const templateProcessor = strapi.service('api::letter-template.template-processor');
      const tokenDetector = strapi.service('api::letter-template.token-detector');
      
      const processingResult = await templateProcessor.processTemplate(files.template_file);
      
      if (!processingResult.success) {
        return ctx.badRequest(`Template processing failed: ${processingResult.error}`);
      }

      // Detect and validate tokens
      const tokenResult = tokenDetector.detectTokens(processingResult.extracted_text);
      const tokenValidation = await tokenDetector.validateContactTokens(tokenResult.summary.contact);

      // Create template entry with processing metadata
      const templateData = {
        ...data,
        template_file: files.template_file,
        processing_metadata: processingResult.metadata,
        token_analysis: {
          tokens: tokenResult.tokens,
          summary: tokenResult.summary,
          validation: tokenValidation,
        },
        html_preview: processingResult.html_content,
        extracted_text: processingResult.extracted_text,
      };

      const entry = await strapi.entityService.create('api::letter-template.letter-template', {
        data: templateData,
        files: files,
      });

      return this.transformResponse({
        ...entry,
        processing_status: 'completed',
        token_analysis: tokenResult,
        token_validation: tokenValidation,
      });
    } catch (error) {
      return ctx.internalServerError(error.message);
    }
  },

  /**
   * Preview template with sample data
   */
  async preview(ctx) {
    try {
      const { id } = ctx.params;
      const { sampleData } = ctx.request.body;

      const template = await strapi.entityService.findOne('api::letter-template.letter-template', id, {
        populate: ['template_file'],
      });

      if (!template) {
        return ctx.notFound('Template not found');
      }

      // Get services
      const tokenDetector = strapi.service('api::letter-template.token-detector');
      
      // Get HTML preview from template or generate from file
      let htmlContent = template.html_preview;
      let extractedText = template.extracted_text;
      
      // If no processed content exists, process the file
      if (!htmlContent && template.template_file) {
        const templateProcessor = strapi.service('api::letter-template.template-processor');
        const file = {
          name: template.template_file.name,
          path: template.template_file.path || template.template_file.url,
          size: template.template_file.size,
        };
        
        const processingResult = await templateProcessor.processTemplate(file);
        if (processingResult.success) {
          htmlContent = processingResult.html_content;
          extractedText = processingResult.extracted_text;
        }
      }
      
      // Replace tokens with sample data
      const previewContent = tokenDetector.replaceTokensWithSample(htmlContent || '', sampleData);
      
      // Generate PDF-like CSS styling
      const pdfCss = this.generatePdfCss(template);
      
      // Return enhanced preview with HTML rendering
      return {
        data: {
          id: template.id,
          name: template.name,
          description: template.description,
          paper_size: template.paper_size,
          orientation: template.orientation,
          margins: template.margins,
          file_url: template.template_file?.url,
          file_name: template.template_file?.name,
          preview_available: true,
          html_preview: previewContent,
          raw_html: htmlContent,
          extracted_text: extractedText,
          css_styles: pdfCss,
          token_count: template.token_analysis?.total || 0,
          preview_html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <style>${pdfCss}</style>
              </head>
              <body class="letter-preview">
                ${previewContent}
              </body>
            </html>
          `,
        },
      };
    } catch (error) {
      return ctx.internalServerError(error.message);
    }
  },

  /**
   * Validate template tokens
   */
  async validateTokens(ctx) {
    try {
      const { id } = ctx.params;
      const { content } = ctx.request.body;

      const template = await strapi.entityService.findOne('api::letter-template.letter-template', id);

      if (!template) {
        return ctx.notFound('Template not found');
      }

      // Extract tokens from content (simplified)
      const tokenRegex = /@(\w+)\.(\w+)/g;
      const tokens = [];
      let match;
      
      while ((match = tokenRegex.exec(content)) !== null) {
        tokens.push(`${match[1]}.${match[2]}`);
      }

      return {
        data: {
          template_id: id,
          tokens_found: tokens,
          token_count: tokens.length,
          validation_result: 'pending', // Would integrate with actual token validation
        },
      };
    } catch (error) {
      return ctx.internalServerError(error.message);
    }
  },

  /**
   * Get templates by category
   */
  async findByCategory(ctx) {
    try {
      const { category } = ctx.params;
      const { query } = ctx;

      const entries = await strapi.entityService.findMany('api::letter-template.letter-template', {
        ...query,
        filters: {
          ...query?.filters,
          category,
          is_active: true,
        },
        populate: ['template_file'],
      });

      return this.transformResponse(entries);
    } catch (error) {
      return ctx.internalServerError(error.message);
    }
  },

  /**
   * Generate PDF-like CSS styling for preview
   * @param {Object} template - Template data
   * @returns {string} CSS styles
   */
  generatePdfCss(template) {
    const margins = template.margins || { top: 2.54, bottom: 2.54, left: 2.54, right: 2.54, unit: 'cm' };
    const unit = margins.unit || 'cm';
    
    // Convert margins to pixels for web display (approximate)
    const unitToPx = {
      'cm': 37.8, // 1cm ≈ 37.8px
      'inch': 96, // 1inch = 96px
      'mm': 3.78, // 1mm ≈ 3.78px
    };
    
    const conversion = unitToPx[unit] || 37.8;
    const topPx = margins.top * conversion;
    const bottomPx = margins.bottom * conversion;
    const leftPx = margins.left * conversion;
    const rightPx = margins.right * conversion;
    
    // Paper size dimensions (in pixels for web display)
    const paperSizes = {
      'A4': { width: '210mm', height: '297mm' },
      'Letter': { width: '8.5in', height: '11in' },
      'Legal': { width: '8.5in', height: '14in' },
      'A5': { width: '148mm', height: '210mm' },
    };
    
    const paperSize = paperSizes[template.paper_size] || paperSizes.A4;
    const orientation = template.orientation === 'landscape' 
      ? { width: paperSize.height, height: paperSize.width }
      : paperSize;
    
    return `
      body.letter-preview {
        margin: 0;
        padding: 0;
        background: #f5f5f5;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        font-family: '${template.default_font_family || 'Arial'}', sans-serif;
        font-size: ${template.default_font_size || 12}pt;
        line-height: 1.5;
      }
      
      .letter-preview .letter-template {
        background: white;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        width: ${orientation.width};
        height: ${orientation.height};
        padding: ${topPx}px ${rightPx}px ${bottomPx}px ${leftPx}px;
        box-sizing: border-box;
        overflow: hidden;
        position: relative;
        page-break-inside: avoid;
      }
      
      .letter-preview h1, .letter-preview h2, .letter-preview h3 {
        margin-top: 1.5em;
        margin-bottom: 0.5em;
        color: #333;
      }
      
      .letter-preview p {
        margin: 0 0 1em 0;
        text-align: justify;
      }
      
      .letter-preview .token-placeholder {
        background-color: #e8f4fd;
        border: 1px dashed #4a90e2;
        padding: 2px 4px;
        border-radius: 3px;
        color: #2c5282;
        font-family: monospace;
      }
      
      .letter-preview .page-break {
        page-break-after: always;
        border-top: 2px dashed #ccc;
        margin: 2em 0;
        padding-top: 2em;
      }
      
      @media print {
        body.letter-preview {
          background: white;
        }
        
        .letter-preview .letter-template {
          box-shadow: none;
          margin: 0;
          padding: 0;
        }
      }
    `;
  },
}));