'use strict';

/**
 * scheduled-composition service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::scheduled-composition.scheduled-composition');
