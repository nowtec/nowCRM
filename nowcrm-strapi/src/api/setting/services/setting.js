'use strict';

/**
 * setting service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::setting.setting');
