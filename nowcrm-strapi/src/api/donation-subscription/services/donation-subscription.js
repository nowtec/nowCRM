'use strict';

/**
 * donation-subscription service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::donation-subscription.donation-subscription');
