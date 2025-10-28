'use strict';

/**
 * quote service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::quote.quote');
