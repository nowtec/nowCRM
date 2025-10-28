'use strict';

/**
 * manual-entry router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::manual-entry.manual-entry');
