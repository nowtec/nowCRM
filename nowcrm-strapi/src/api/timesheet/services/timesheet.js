'use strict';

/**
 * timesheet service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::timesheet.timesheet');
