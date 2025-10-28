'use strict';

/**
 * department service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::department.department');
