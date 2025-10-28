'use strict';

/**
 * journey service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::journey.journey');
