'use strict';

/**
 * email-template service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::email-template.email-template');
