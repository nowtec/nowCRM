'use strict';

/**
 * expense controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::expense.expense');
