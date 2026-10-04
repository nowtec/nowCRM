'use strict';

module.exports = ({ strapi }) => ({
  detectTokens(content) {
    try {
      const pattern = /@(\w+)\.(\w+)/g;
      const tokens = [], map = { contact: new Set(), text_block: new Set(), other: new Set() };
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const [full, type, field] = match;
        tokens.push({ full, type, field });
        map[type] ? map[type].add(field) : map.other.add(`${type}.${field}`);
      }
      const summary = {
        contact: Array.from(map.contact),
        text_block: Array.from(map.text_block),
        other: Array.from(map.other),
      };
      return {
        success: true, tokens, summary,
        total: tokens.length,
        unique: summary.contact.length + summary.text_block.length + summary.other.length,
      };
    } catch (error) {
      strapi.log.error(`Token error: ${error.message}`);
      return { success: false, error: error.message, tokens: [], summary: { contact: [], text_block: [], other: [] } };
    }
  },

  async validateContactTokens(contactTokens) {
    if (!contactTokens || contactTokens.length === 0) {
      return { valid: true, validated: [], invalid: [], fields: [] };
    }
    try {
      const fields = await this.getAvailableContactFields();
      const validated = [], invalid = [];
      contactTokens.forEach(field => fields.includes(field) ? validated.push(field) : invalid.push(field));
      return {
        valid: invalid.length === 0,
        validated, invalid, fields,
        summary: { total: contactTokens.length, valid: validated.length, invalid: invalid.length },
      };
    } catch (error) {
      strapi.log.error(`Validation failed: ${error.message}`);
      return { valid: false, error: error.message, validated: [], invalid: contactTokens, fields: [] };
    }
  },

  async getAvailableContactFields() {
    try {
      const contentTypeService = strapi.plugin('content-type-builder').service('content-types');
      const contentTypes = await contentTypeService.getContentTypes();
      const contactType = contentTypes.find(ct => ct.uid === 'api::contact.contact');
      if (!contactType) return ['name', 'email', 'phone', 'address', 'company'];
      const fields = Object.keys(contactType.schema.attributes || {});
      const systemFields = ['id', 'createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy'];
      return fields.filter(field => !systemFields.includes(field) && !field.endsWith('_id'));
    } catch (error) {
      strapi.log.warn(`Contact fields fallback: ${error.message}`);
      return ['name', 'email', 'phone', 'address', 'company'];
    }
  },

  replaceTokensWithSample(content, sampleData = {}) {
    const data = {
      contact: { name: 'John Doe', email: 'john@example.com', phone: '+1234567890', company: 'Example Corp' },
      text_block: { greeting: 'Dear customer,', closing: 'Best regards,' },
      ...sampleData,
    };
    return content.replace(/@(\w+)\.(\w+)/g, (m, t, f) => data[t] && data[t][f] !== undefined ? data[t][f] : `[${t}.${f}]`);
  },
});