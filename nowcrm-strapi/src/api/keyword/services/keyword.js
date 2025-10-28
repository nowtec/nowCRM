'use strict';

/**
 * keyword service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::keyword.keyword');
