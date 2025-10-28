'use strict';

/**
 * donation-transaction service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::donation-transaction.donation-transaction');
