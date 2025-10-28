'use strict';

/**
 * quote router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::quote.quote');
