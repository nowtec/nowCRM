'use strict';
const axios = require('axios');
/**
 * document controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::document.document');


