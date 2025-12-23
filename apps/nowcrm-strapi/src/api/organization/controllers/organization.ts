/**
 * organization controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::organization.organization', ({ strapi }) => ({

async duplicate(ctx) {
    const { id } = ctx.request.body;
    const user = ctx.state.user;

    if (!id) return ctx.badRequest("Missing organization id");
    if (!user) return ctx.unauthorized("User not authenticated");

    try {
      const original = await strapi.documents('api::organization.organization').findOne({
        documentId: id,
        populate: {
          frequency: true,
          media_type: true,
          contacts: true,
          organization_type: true,
          sources: true,
          industry: true,
        },
      });

      if (!original) return ctx.notFound("Original organization not found");

      const {
        id: _,
        documentId: __,
        createdAt,
        updatedAt,
        publishedAt,
        contacts,
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

      const newOrganization = await strapi.documents("api::organization.organization").create({
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
          error: error?.message,
        },
        500
      );
    }
  },
}))