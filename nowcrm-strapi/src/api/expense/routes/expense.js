'use strict';

/**
 * expense router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::expense.expense');
