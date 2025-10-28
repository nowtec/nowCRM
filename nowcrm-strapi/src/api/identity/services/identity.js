'use strict';

/**
 * identity service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::identity.identity');
