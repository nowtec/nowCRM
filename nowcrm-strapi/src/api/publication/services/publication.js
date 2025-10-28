'use strict';

/**
 * publication service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::publication.publication');
