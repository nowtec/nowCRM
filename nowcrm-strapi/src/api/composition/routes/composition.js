'use strict';

/**
 * composition router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::composition.composition');
