'use strict';

/**
 * action service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::action.action');
