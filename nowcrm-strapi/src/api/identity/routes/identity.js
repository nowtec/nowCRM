'use strict';

/**
 * identity router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::identity.identity');
