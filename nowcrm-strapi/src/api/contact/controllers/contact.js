'use strict';
/**
 * contact controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::contact.contact', ({ strapi }) => ({
  async duplicate(ctx) {
    const { id } = ctx.request.body;
    const user = ctx.state.user;

    if (!id) return ctx.badRequest("Missing contact id");
    if (!user) return ctx.unauthorized("User not authenticated");

    try {
      // 🔄 Fetch original contact with relations
      const original = await strapi.entityService.findOne('api::contact.contact', id, {
        populate: {
          subscriptions: {
            populate: ['channel', 'subscription_type', 'consent'],
          },
          organization: true,
          lists: true,
        },
      });

      if (!original) return ctx.notFound("Contact not found");

      // 🧹 Destructure and sanitize
      const {
        subscriptions,
        id: _,
        key,
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
      };

      // 🏢 Preserve organization (many-to-one)
      if (original.organization?.id) {
        newContactData.organization = original.organization.id;
      }

      // Create new contact (no lists or subscriptions yet)
      const newContact = await strapi.entityService.create('api::contact.contact', {
        data: newContactData,
      });

      // 🔗 Re-attach lists (many-to-many)
      if (Array.isArray(original.lists) && original.lists.length > 0) {
        await strapi.entityService.update('api::contact.contact', newContact.id, {
          data: {
            lists: {
              connect: original.lists.map(list => list.id),
            },
          },
        });
      }

      // 🔁 Duplicate subscriptions safely
      for (const sub of subscriptions || []) {
        let {
          id: _subId,
          createdAt,
          updatedAt,
          publishedAt,
          contact,
          period,
          ...subData
        } = sub;

        // Convert nested relations to connect format (if lifecycle expects it)
        if (sub.channel?.id) {
          subData.channel = { connect: [sub.channel.id] };
        }
        if (sub.subscription_type?.id) {
          subData.subscription_type = { connect: [sub.subscription_type.id] };
        }
        if (sub.consent?.id) {
          subData.consent = { connect: [sub.consent.id] };
        }

        // Clean + augment
        subData.contact = newContact.id;
        subData.publishedAt = new Date().toISOString();
        delete subData.unsubscribe_token;


        if (typeof period === 'number') {
          subData.period = period;
        }

        // Final cleanup
        Object.keys(subData).forEach((key) => {
          if (subData[key] === undefined || subData[key] === null) {
            delete subData[key];
          }
        });

        await strapi.entityService.create('api::subscription.subscription', {
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

    if (!contactId) {
      return ctx.badRequest("Missing contact ID");
    }

    try {
      const contact = await strapi.entityService.findOne('api::contact.contact', contactId, {
        populate: {
          publications: true,
          organization: true,
          lists: true,
          contact_interests: true,
          journey_steps: true,
          journeys: true,
          subscriptions: true,
          actions: true,
          tag: true,
          documents: true,
          contact_relationships: true,
          survey_items: true,
          journey_passed_steps: true,
          ranks: true,
          contact_types: true,
          sources: true,
          submissions: true,
          courses: true,
          media_types: true,
        },
      });

      await strapi.db.query('api::activity-log.activity-log').create({
        data: {
          action: "Exported",
          description: "Contact data exported by user.",
          users_permissions_user: ctx.state.user?.id || null,
          contact: contactId,
          publishedAt: new Date().toISOString(),
        },
      });

      if (!contact) return ctx.notFound("Contact not found");

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

    if (!contactId) {
      return ctx.badRequest("Missing contact ID");
    }

    try {
      const updatedContact = await strapi.entityService.update('api::contact.contact', contactId, {
        data: {
          first_name: null,
          last_name: null,
          email: `deleted+${contactId}@example.com`,
          function: null,
          address_line1: null,
          address_line2: null,
          location: null,
          canton: null,
          publications: [],
          organization: null,
          salutation: null,
          lists: [],
          key: null,
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
          tag: null,
          description: null,
          documents: [],
          contact_relationships: [],
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
          courses: [],
          unsubscribe_token: null,
          birth_date: null,
          media_types: [],
          createdBy: null,
          updatedBy: null,
        },
      });

      await strapi.db.query('api::activity-log.activity-log').create({
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

  // --- bulk create for all entities  ---
  async bulkCreate(ctx) {
    const { entity, data } = ctx.request.body;

    if (!Array.isArray(data) || data.length === 0) {
      return ctx.badRequest("`data` must be a non-empty array");
    }

    const modelName = entity && typeof entity === "string"
      ? `api::${entity}.${entity}`
      : "api::contact.contact";

    strapi.log.info(
      `bulkCreate: target model = ${modelName}, items = ${data.length}`
    );

    const now = new Date().toISOString();
    const payload = data.map(item => ({
      ...item,
      publishedAt: now,
    }));

    try {
      const start = Date.now();
      const result = await strapi.db
        .query(modelName)
        .createMany({ data: payload });

      const duration = Date.now() - start;
      strapi.log.info(
        `bulkCreate succeeded for ${modelName}: count=${result.count}, time=${duration}ms`
      );

      return ctx.send({
        success: true,
        count: result.count,
        ids: result.ids || [],
        entity: modelName,
      });
    } catch (err) {
      strapi.log.error(`bulkCreate error for ${modelName}:`, err);
      return ctx.send(
        {
          success: false,
          message: err.message || "Bulk create failed",
        },
        500
      );
    }
  },

  // --- bulk update ---
  async bulkUpdate(ctx) {
    const { where, data, entity } = ctx.request.body;

  const uid = entity === 'organization'
    ? 'api::organization.organization'
    : 'api::contact.contact';

  try {
    if (Array.isArray(data)) {
      if (!data.length)
        return ctx.badRequest('`data` array is empty');
        const results = await Promise.allSettled(
          data.map(async ({ id, ...fields }) => {
            if (typeof id !== 'number') throw new Error('Invalid id');
            return strapi.db.query(uid).update({ where: { id }, data: fields });
          })
        );
        
        const ok = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        const bad = results.filter(r => r.status === 'rejected');
        
        if (bad.length) console.warn(`[bulkUpdate] failed: ${bad.length}, first: ${bad[0].reason?.message}`);
        
        return ctx.send({
          success: bad.length === 0,
          updated: ok.length,
          failed: bad.length,
          ids: ok.map(r => r.id),
        });        
    }

    if (typeof where !== 'object' || where === null) {
      return ctx.badRequest('`where` filter must be provided');
    }
    if (typeof data !== 'object' || data === null) {
      return ctx.badRequest('`data` object must be provided');
    }

      const result = await strapi.db
        .query(uid)
        .updateMany({ where, data });

      return ctx.send({ success: true, count: result.count });
    } catch (err) {
    // --- concise debug log ---
    const shortStack = err.stack ? err.stack.split('\n')[1]?.trim() : 'no stack';
    console.error(`[bulkUpdate] ${entity || 'unknown entity'} failed`);
    console.error(`  message: ${err.message}`);
    console.error(`  type: ${err.name}`);
    console.error(`  location: ${shortStack}`);
    if (where) console.error('  where keys:', Object.keys(where));
    if (data && !Array.isArray(data)) console.error('  data keys:', Object.keys(data));

      const status = err.message.includes('Invalid id') ? 400 : 500;
      return ctx.send(
        {
          success: false,
          message: 'Bulk update failed',
          error: err.message,
        },
        status
      );
    }
  },

  // --- bulk delete ---
  async bulkDelete(ctx) {
    const { where } = ctx.request.body;
    if (typeof where !== 'object' || where === null) {
      return ctx.badRequest('`where` filter must be provided');
    }

    try {
      const result = await strapi.db
        .query('api::contact.contact')
        .deleteMany({ where });

      // Optionally log bulk-delete activity
      await strapi.db.query('api::activity-log.activity-log').create({
        data: {
          action: 'Bulk Deleted',
          description: `Deleted ${result.count} contacts in bulk.`,
          users_permissions_user: ctx.state.user?.id || null,
          publishedAt: new Date().toISOString(),
        },
      });

      return ctx.send({ success: true, count: result.count });
    } catch (err) {
      console.error('Bulk delete error:', err);
      return ctx.send(
        {
          success: false,
          message: 'Bulk delete failed',
          error: err?.message,
        },
        500
      );
    }
  },

}));
