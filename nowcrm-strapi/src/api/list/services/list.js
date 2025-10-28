'use strict';

/**
 * list service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::list.list');
