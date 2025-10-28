'use strict';

/**
 * search-history service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::search-history.search-history');
