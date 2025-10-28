'use strict';

/**
 * composition service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::composition.composition');
