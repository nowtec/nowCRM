'use strict';

/**
 * email service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::email.email');
