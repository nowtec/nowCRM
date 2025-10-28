'use strict';

/**
 * unipile-identity service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::unipile-identity.unipile-identity');
