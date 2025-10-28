'use strict';

/**
 * channel service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::channel.channel');
