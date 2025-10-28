'use strict';

/**
 * job controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::job.job');
