'use strict';

/**
 * media-type service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::media-type.media-type');
