'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::journey.journey', ({ strapi }) => ({
  async duplicate(ctx) {
    const { id } = ctx.request.body;
    const user = ctx.state.user;

    if (!id) return ctx.badRequest("Missing journey ID");
    if (!user) return ctx.unauthorized("User not authenticated");

    try {
      // 1. Load the original journey with steps, connections, rules, and relations
      const original = await strapi.entityService.findOne('api::journey.journey', id, {
        populate: {
          contacts: true,
          journey_steps: {
            populate: {
              contacts: true,
              composition: true,
              channel: true,
              identity: true,
              connections_from_this_step: {
                populate: {
                  journey_step_rules: true,
                  source_step: true,
                  target_step: true,
                },
              },
            },
          },
        },
      });

      if (!original) return ctx.notFound("Original journey not found");

      const {
        id: _,
        createdAt,
        updatedAt,
        publishedAt,
        journey_steps,
        journey_passed_steps,
        ...baseData
      } = original;

      // 2. Duplicate the journey itself
      const newJourney = await strapi.entityService.create('api::journey.journey', {
        data: {
          ...baseData,
          name: `${original.name} (Copy)`,
          contacts: original.contacts.map(c => c.id),
          active: false,
          publishedAt: new Date().toISOString(),
        },
      });

      // 3. Duplicate steps and build stepIdMap
      const stepIdMap = {};
      for (const step of journey_steps) {
        const {
          id: oldStepId,
          createdAt,
          updatedAt,
          publishedAt,
          journey,
          connections_from_this_step,
          connections_to_this_step,
          composition,
          channel,
          identity,
          contacts,
          ...stepData
        } = step;

        const newStep = await strapi.entityService.create('api::journey-step.journey-step', {
          data: {
            ...stepData,
            journey: newJourney.id,
            publishedAt: new Date().toISOString(),

            // Explicitly handle relations
            composition: composition ? composition.id : null,
            channel: channel ? channel.id : null,
            identity: identity ? identity.id : null,
            contacts: contacts?.map(c => c.id) || [],
          },
        });

        stepIdMap[oldStepId] = newStep.id;
      }

      // 4. Duplicate connections + rules
      let connectionCount = 0;
      let ruleCount = 0;

      for (const step of journey_steps) {
        for (const conn of step.connections_from_this_step) {
          const {
            id: _connId,
            createdAt,
            updatedAt,
            publishedAt,
            source_step,
            target_step,
            journey_step_rules,
            ...connData
          } = conn;

          const newSourceId = source_step?.id ? stepIdMap[source_step.id] : null;
          const newTargetId = target_step?.id ? stepIdMap[target_step.id] : null;

          if (newSourceId && newTargetId) {
            const newConn = await strapi.entityService.create(
              'api::journey-step-connection.journey-step-connection',
              {
                data: {
                  ...connData,
                  source_step: newSourceId,
                  target_step: newTargetId,
                },
              }
            );

            connectionCount++;

            // Duplicate rules for this connection
            if (journey_step_rules?.length) {
              for (const rule of journey_step_rules) {
                const {
                  id: _ruleId,
                  createdAt,
                  updatedAt,
                  publishedAt,
                  journey_step_connection,
                  ...ruleData
                } = rule;

                await strapi.entityService.create(
                  'api::journey-step-rule.journey-step-rule',
                  {
                    data: {
                      ...ruleData,
                      journey_step_connection: newConn.id,
                    },
                  }
                );

                ruleCount++;
              }
            }
          } else {
            strapi.log.warn(
              `Skipped connection ${_connId} because source or target step was missing.`
            );
          }
        }
      }

      // 5. Return success with stats
      return {
        success: true,
        message: 'Journey duplicated successfully',
        data: newJourney,
        stats: {
          steps: Object.keys(stepIdMap).length,
          connections: connectionCount,
          rules: ruleCount,
        },
      };
    } catch (err) {
      strapi.log.error('Journey duplication failed', err);
      return ctx.internalServerError({
        success: false,
        message: 'Failed to duplicate journey',
        error: err?.message || err,
      });
    }
  },
}));
