'use strict';

/**
 * consent service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::consent.consent');
