'use strict';

/**
 * source service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::source.source');
