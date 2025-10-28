'use strict';
const axios = require('axios');
const qr = require('qrcode');
/**
 * composition controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::composition.composition', ({ strapi }) => ({
  async createReference(ctx) {
    try {
      const { body } = ctx.request;
      // const composer_url = `http://${COMPOSER_HOST}:${COMPOSER_PORT}/composer/create-reference`;
      const composer_url = `http://localhost:3020/composer/create-reference`;
      console.log(body)
      console.log(composer_url)
      const response = await axios.post(composer_url, body)
      console.log(response)
      return response.data;
    } catch (error) {
      console.log(error)
      return {
        success: false,
        error: error.message,
        content: null,
        html: ''
      }
    }
  },

  async duplicate(ctx) {
    const { id } = ctx.request.body;
    const user = ctx.state.user;

    if (!id) return ctx.badRequest("Missing composition id");
    if (!user) return ctx.unauthorized("User not authenticated");

    try {
      // 🔍 Fetch the original composition and its items (with channels)
      const original = await strapi.entityService.findOne('api::composition.composition', id, {
        populate: {
          composition_items: {
            populate: ['channel'],
          },
        },
      });

      if (!original) return ctx.notFound("Composition not found");

      // 🧼 Destructure and clean base composition
      const {
        id: _,
        createdAt,
        updatedAt,
        publishedAt,
        composition_items,
        ...baseData
      } = original;

      const duplicateData = {
        ...baseData,
        name: `${original.name} (Copy)`,
        publishedAt: new Date().toISOString(),
      };

      // 🆕 Create the new composition
      const newComposition = await strapi.entityService.create('api::composition.composition', {
        data: duplicateData,
      });

      // 🔁 Duplicate each item and attach to new composition
      for (const item of composition_items || []) {
        const {
          id: _itemId,
          createdAt,
          updatedAt,
          publishedAt,
          composition,
          ...itemData
        } = item;

        // Normalize channel relation (optional: use connect pattern if lifecycle expects it)
        if (itemData.channel && typeof itemData.channel === 'object') {
          itemData.channel = itemData.channel.id;
        }

        // Create new item with fresh publication and reference to new composition
        await strapi.entityService.create('api::composition-item.composition-item', {
          data: {
            ...itemData,
            composition: newComposition.id,
            publishedAt: new Date().toISOString(),
          },
        });
      }

      return ctx.send({
        success: true,
        data: newComposition,
      });

    } catch (err) {
      console.error('❌ Duplicate composition error:', err);
      return ctx.send({
        success: false,
        message: 'Failed to duplicate composition',
        error: err?.message || 'Unknown error',
      }, 500);
    }
  },
}));
