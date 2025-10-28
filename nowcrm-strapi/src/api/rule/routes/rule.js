'use strict';

/**
 * rule router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::rule.rule');
