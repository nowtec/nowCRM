/**
 * list controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::list.list', ({ strapi }) => ({

    async activeContactsCount(ctx) {
        const listId = ctx.params.id;
        const count = await strapi.db.query('api::contact.contact').count({
        where: {
            lists: { documentId: listId },
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
      const original = await strapi.documents('api::list.list').findOne({
        documentId: id,
        populate: ['contacts']
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
        title: `${original.name} (Copy)`,
        contacts: {
          connect: contacts.map(contact => contact.id),
        },
        publishedAt: new Date().toISOString(),
      };

      const newList = await strapi.documents('api::list.list').create({
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
          error: error?.message,
        },
        500
      );
    }
  },

}))