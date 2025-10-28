'use strict';

/**
 * chapter service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::chapter.chapter');
