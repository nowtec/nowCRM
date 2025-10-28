'use strict';

/**
 * timesheet router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::timesheet.timesheet');
