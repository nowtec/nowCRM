'use strict';

/**
 * quote controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::quote.quote');
