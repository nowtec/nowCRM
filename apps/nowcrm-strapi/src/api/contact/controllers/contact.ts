/**
 * contact controller for Strapi v5
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::contact.contact', ({ strapi }) => ({

  
  async duplicate(ctx) {
    const { id } = ctx.request.body;
    const user = ctx.state.user;

    if (!id) return ctx.badRequest("Missing contact id");
    if (!user) return ctx.unauthorized("User not authenticated");

    try {
      // Fetch original contact (v5: use strapi.documents)
      const original = await strapi.documents('api::contact.contact').findOne({
        documentId: id,
        populate: {
          subscriptions: {
            populate: ['channel', 'subscription_type', 'consent'],
          },
          organization: true,
          lists: true,
        },
      });

      if (!original) return ctx.notFound("Contact not found");

      // Sanitize and prepare new contact
      const {
        subscriptions,
        documentId: _,
        unsubscribe_token,
        createdAt,
        updatedAt,
        publishedAt,
        ...rest
      } = original;

      const newContactData = {
        ...rest,
        first_name: `${original.first_name || ''} (Copy)`,
        publishedAt: new Date().toISOString(),
        organization: null
      };

      // Preserve org (relation)
      if (original.organization?.documentId) {
        newContactData.organization = original.organization.documentId;
      }

      // Create the new contact
      const newContact = await strapi.documents('api::contact.contact').create({
        data: newContactData,
      });

      // Re-attach lists (many-to-many)
      if (Array.isArray(original.lists) && original.lists.length > 0) {
        await strapi.documents('api::contact.contact').update({
          documentId: newContact.documentId,
          data: {
            lists: {
              connect: [],
            },
          } as any //needed cause strapi has typing error here,
        });
      }

      // Duplicate subscriptions
      for (const sub of subscriptions || []) {
        let {
          documentId: _subId,
          createdAt,
          updatedAt,
          publishedAt,
          contact,
          period,
          channel: _subchannel,
          subscription_type: _subtype,
          consent: _subconsent,
          ...subData
        } = sub as any;

        // Convert nested relations
        if (sub.channel?.documentId) {
          subData.channel = sub.channel.documentId;
        }
        if (sub.subscription_type?.documentId) {
          subData.subscription_type = sub.subscription_type.documentId;
        }
        if (sub.consent?.documentId) {
          subData.consent = sub.consent.documentId;
        }

        subData.contact = newContact.documentId;
        subData.publishedAt = new Date().toISOString();
        delete subData.unsubscribe_token;

        if (typeof period === 'number') subData.period = period;

        // Cleanup nulls
        Object.keys(subData).forEach((key) => {
          if (subData[key] == null) delete subData[key];
        });

        await strapi.documents('api::subscription.subscription').create({
          data: subData,
        });
      }

      return ctx.send({
        success: true,
        data: newContact,
      });

    } catch (err) {
      console.error('❌ Duplicate contact error:', err);
      return ctx.send({
        success: false,
        message: 'Failed to duplicate contact',
        error: err?.message || 'Unknown error',
      }, 500);
    }
  },

  async exportUserData(ctx) {
    const { contactId } = ctx.request.body;
    if (!contactId) return ctx.badRequest("Missing contact ID");

    try {
      const contact = await strapi.documents('api::contact.contact').findOne({
        documentId: contactId,
        populate: [
          'organization',
          'lists',
          'contact_interests',
          'journey_steps',
          'journeys',
          'subscriptions',
          'actions',
          'tags',
          'contact_documents',
          'journey_passed_steps',
          'ranks',
          'contact_types',
          'sources',
          'media_types',
        ],
      });

      if (!contact) return ctx.notFound("Contact not found");

      await strapi.documents('api::activity-log.activity-log').create({
        data: {
          action: "Exported",
          description: "Contact data exported by user.",
          users_permissions_user: ctx.state.user?.id || null,
          contact: contactId,
          publishedAt: new Date().toISOString(),
        },
      });

      return ctx.send({
        success: true,
        message: "Contact exported successfully",
        data: contact,
      });
    } catch (err) {
      console.error("Export error:", err);
      return ctx.send({
        success: false,
        message: "Something went wrong",
        error: err?.message,
      }, 500);
    }
  },

  async anonymizeUserData(ctx) {
    const { contactId } = ctx.request.body;
    if (!contactId) return ctx.badRequest("Missing contact ID");

    try {
      const updatedContact = await strapi.documents('api::contact.contact').update({
        documentId: contactId,
        data: {
          first_name: null,
          last_name: null,
          email: `deleted+${contactId}@example.com`,
          function: null,
          address_line1: null,
          address_line2: null,
          location: null,
          canton: null,
          organization: null,
          salutation: null,
          lists: [],
          phone: null,
          contact_interests: [],
          department: null,
          consent: null,
          contact_extra_fields: null,
          language: null,
          gender: null,
          mobile_phone: null,
          plz: null,
          journey_steps: [],
          journeys: [],
          subscriptions: [],
          actions: [],
          priority: null,
          status: null,
          description: null,
          contact_documents: [],
          country: null,
          linkedin_url: null,
          facebook_url: null,
          twitter_url: null,
          survey_items: [],
          journey_passed_steps: [],
          keywords: [],
          last_access: null,
          account_created_at: null,
          ranks: [],
          contact_types: [],
          sources: [],
          zip: null,
          website_url: null,
          submissions: [],
          notes: null,
          industry: null,
          unsubscribe_token: null,
          birth_date: null,
          media_types: [],
          createdBy: null,
          updatedBy: null,
        } as any //needed cause strapi has typing error here,
      });

      await strapi.documents('api::activity-log.activity-log').create({
        data: {
          action: "Anonymized",
          description: "Contact data anonymized by user.",
          users_permissions_user: ctx.state.user?.id || null,
          contact: contactId,
          publishedAt: new Date().toISOString(),
        },
      });

      return ctx.send({
        success: true,
        message: "Contact anonymized successfully",
        data: updatedContact,
      });
    } catch (err) {
      console.error("Anonymization error:", err);
      return ctx.send({
        success: false,
        message: "Failed to anonymize contact",
        error: err?.message,
      }, 500);
    }
  },

  //сheck if it returns both identifiers
  async bulkCreate(ctx) {
    const { entity, data } = ctx.request.body;
    if (!Array.isArray(data) || data.length === 0) {
      return ctx.badRequest("`data` must be a non-empty array");
    }

    const modelName = entity && typeof entity === "string"
      ? `api::${entity}.${entity}`
      : "api::contact.contact";

    try {
      const now = new Date().toISOString();
      const payload = data.map(item => ({
        ...item,
        publishedAt: now,
      }));

      const created = [];
      for (const item of payload) {
        const doc = await strapi.documents(modelName as any).create({ data: item });
      created.push({
        documentId: doc.documentId,
        id: doc.id,
      });      }

      return ctx.send({
        success: true,
        count: created.length,
        ids: created,
        entity: modelName,
      });
    } catch (err) {
      console.error(`bulkCreate error for ${modelName}:`, err);
      return ctx.send(
        { success: false, message: err.message || "Bulk create failed" },
        500
      );
    }
  },

  async bulkUpdate(ctx) {
    const { where, data, entity } = ctx.request.body;
    const uid = entity === 'organization'
      ? 'api::organization.organization'
      : 'api::contact.contact';

    try {
      if (Array.isArray(data)) {
        const results = await Promise.allSettled(
          data.map(async ({ documentId, ...fields }) => {
            if (!documentId) throw new Error('Missing documentId');
            return strapi.documents(uid).update({ documentId, data: fields });
          })
        );

        const ok = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value);

        const bad = results.filter(r => r.status === 'rejected');

        return ctx.send({
          success: bad.length === 0,
          updated: ok.length,
          failed: bad.length,
          ids: ok.map(r => r.documentId),
        });
      }

      return ctx.badRequest('Invalid data format for bulk update');
    } catch (err) {
      console.error(`[bulkUpdate] failed: ${err.message}`);
      return ctx.send({ success: false, message: err.message }, 500);
    }
  },

  async bulkDelete(ctx) {
    const { where } = ctx.request.body;
    if (!where || typeof where !== 'object') {
      return ctx.badRequest('`where` filter must be provided');
    }

    try {
      const docs = await strapi.documents('api::contact.contact').findMany( where );
      for (const doc of docs) {
        await strapi.documents('api::contact.contact').delete({ documentId: doc.documentId });
      }

      await strapi.documents('api::activity-log.activity-log').create({
        data: {
          action: 'Bulk Deleted',
          description: `Deleted ${docs.length} contacts in bulk.`,
          users_permissions_user: ctx.state.user?.id || null,
          publishedAt: new Date().toISOString(),
        },
      });

      return ctx.send({ success: true, count: docs.length });
    } catch (err) {
      console.error('Bulk delete error:', err);
      return ctx.send(
        { success: false, message: 'Bulk delete failed', error: err.message },
        500
      );
    }
  }

}));
