'use strict';

/**
 * email controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::email.email');
