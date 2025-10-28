'use strict';

/**
 * timesheet controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::timesheet.timesheet');
