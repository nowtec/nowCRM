'use strict';

/**
 * organization controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
'use strict';

module.exports = createCoreController('api::organization.organization', ({ strapi }) => ({
  async duplicate(ctx) {
    const { id } = ctx.request.body;
    const user = ctx.state.user;

    if (!id) return ctx.badRequest("Missing organization id");
    if (!user) return ctx.unauthorized("User not authenticated");

    try {
      const original = await strapi.entityService.findOne('api::organization.organization', id, {
        populate: {
          frequency: true,
          media_type: true,
          organization_type: true,
          sources: true,
          industry: true,
        },
      });

      if (!original) return ctx.notFound("Original organization not found");

      const {
        id: _,
        createdAt,
        updatedAt,
        publishedAt,
        contacts,
        jobs,
        books,
        embeddable_reports,
        ...baseData
      } = original;

      const extractId = (rel) =>
        Array.isArray(rel) ? rel.map((item) => item.id) : rel?.id ?? null;

      const newOrgData = {
        ...baseData,
        name: `${original.name} (Copy)`,

        frequency: extractId(original.frequency),
        media_type: extractId(original.media_type),
        organization_type: extractId(original.organization_type),
        industry: extractId(original.industry),
        sources: extractId(original.sources),

        users: [user.id],
        publishedAt: new Date().toISOString(),
      };

      const newOrganization = await strapi.entityService.create('api::organization.organization', {
        data: newOrgData,
      });

      return {
        success: true,
        data: newOrganization,
      };
    } catch (error) {
      return ctx.send(
        {
          success: false,
          message: 'Failed to duplicate organization',
          error: err?.message,
        },
        500
      );
    }
  },
}));

