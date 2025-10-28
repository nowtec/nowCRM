'use strict';

/**
 * composition-prompt service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::composition-prompt.composition-prompt');
