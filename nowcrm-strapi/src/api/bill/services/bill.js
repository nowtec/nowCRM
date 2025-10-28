'use strict';

/**
 * bill service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::bill.bill');
