'use strict';

/**
 * email-log service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::email-log.email-log');
