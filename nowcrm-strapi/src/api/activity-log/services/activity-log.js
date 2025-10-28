'use strict';

/**
 * activity-log service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::activity-log.activity-log');
