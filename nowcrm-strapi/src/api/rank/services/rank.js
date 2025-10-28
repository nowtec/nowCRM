'use strict';

/**
 * rank service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::rank.rank');
