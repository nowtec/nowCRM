'use strict';

/**
 * rule service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::rule.rule');
