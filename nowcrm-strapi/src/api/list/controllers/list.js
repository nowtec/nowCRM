'use strict';

/**
 * list controller
 */
const axios = require('axios');
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::list.list', ({ strapi }) => ({
  async activeContactsCount(ctx) {
    const listId = ctx.params.id;
    const count = await strapi.db.query('api::contact.contact').count({
      where: {
        lists: { id: listId },
        published_at: { $notNull: true },
      },
    });
    ctx.send({ count });
  },

  async duplicate(ctx) {
    const { id } = ctx.request.body;
    const user = ctx.state.user;

    if (!id) return ctx.badRequest("Missing list ID");
    if (!user) return ctx.unauthorized("User not authenticated");
    try {
      const original = await strapi.entityService.findOne('api::list.list', id, {
        populate: ['contacts'],
      });

      if (!original) return ctx.notFound("Original list not found");

      const {
        id: _,
        createdAt,
        updatedAt,
        publishedAt,
        contacts,
        ...baseData
      } = original;

      const newListData = {
        ...baseData,
        name: `${original.name} (Copy)`,
        title: `${original.title || original.name} (Copy)`,
        contacts: {
          connect: contacts.map(contact => contact.id),
        },
        publishedAt: new Date().toISOString(),
      };

      const newList = await strapi.entityService.create('api::list.list', {
        data: newListData,
      });

      return {
        success: true,
        data: newList,
      };
    } catch (error) {
      return ctx.send(
        {
          success: false,
          message: 'Failed to duplicate list',
          error: err?.message,
        },
        500
      );
    }
  },
}));
