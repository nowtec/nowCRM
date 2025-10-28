'use strict';

/**
 * campaign service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::campaign.campaign');
