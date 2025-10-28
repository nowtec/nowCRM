'use strict';

/**
 * document service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::document.document');
