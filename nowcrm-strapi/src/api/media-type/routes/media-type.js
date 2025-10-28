'use strict';

/**
 * media-type router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::media-type.media-type');
