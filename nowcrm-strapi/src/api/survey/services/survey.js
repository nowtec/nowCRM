'use strict';

/**
 * survey service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::survey.survey');
