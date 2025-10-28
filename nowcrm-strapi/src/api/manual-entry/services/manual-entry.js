'use strict';

/**
 * manual-entry service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::manual-entry.manual-entry');
