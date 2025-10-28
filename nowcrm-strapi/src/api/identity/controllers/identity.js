'use strict';

/**
 * identity controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::identity.identity');
