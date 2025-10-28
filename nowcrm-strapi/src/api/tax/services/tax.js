'use strict';

/**
 * tax service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::tax.tax');
