'use strict';

/**
 * user-bexio service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::user-bexio.user-bexio');
