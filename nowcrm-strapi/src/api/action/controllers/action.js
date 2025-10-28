'use strict';

/**
 * action controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::action.action');
