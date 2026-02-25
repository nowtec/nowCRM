import { v4 as uuidv4 } from 'uuid';
import { getUpdateDifferences } from '../../functions/getUpdateDifferences';

export default {
  async beforeCreate(event) {
    const { data } = event.params;

    data.unsubscribe_token = uuidv4();

    // fetch latest active consent
    const consent = await strapi.db.query('api::consent.consent').findOne({
      select: ['id', 'version'],
      where: { active: true },
      orderBy: { updatedAt: 'DESC' }
    });

    if (consent && consent.id) {
      // strapi v5 relation assignment pattern
      data.consent = { connect: [consent.id] };
    } else {
      console.warn('No active consent record found. Proceeding without consent assignment.');
    }
  },

  async afterUpdate(event) {
    try {
      const { data, where } = event.params;
      let description = '';
      const action = 'Modified';
      let users_permissions_user: number | null = null;

      // detect update origin (Strapi UI or user token)
      if (data.updatedBy !== null && data.updatedBy > 0) {
        description += `(from Strapi UI by user: ${data.updatedBy}) `;
      } else if (data.user_token !== undefined && data.user_token.length) {
        const jwtUser_b64 = data.user_token.split('.')[1];
        const jwtUser = JSON.parse(Buffer.from(jwtUser_b64, 'base64').toString());
        users_permissions_user = jwtUser.id;
        delete data.user_token;
      }

      // get changed fields
      const diff = await getUpdateDifferences(event.params);
      if (diff && Object.keys(diff).length) {
        description += 'Affected fields: ' + JSON.stringify(diff);

        // create activity log entry
        await strapi.db.query('api::activity-log.activity-log').create({
          data: {
            action,
            description,
            users_permissions_user,
            contact: data.id || where?.id,
            publishedAt: new Date().getTime()
          }
        });
      }

      // handle subscription updates
      if (data?.channels) {
        const contact_id = data.id || where?.id;

        // fetch all current subscriptions for contact
        const subscriptions = await strapi.db.query('api::subscription.subscription').findMany({
          where: { contact: { id: contact_id } },
          populate: ['channel']
        });

        // update existing subscriptions
        for (const subscription of subscriptions) {
          const uData: Record<string, any> = {};
          if (data.channels.includes(subscription.channel.id)) {
            uData.active = true;
            uData.subscribed_at = new Date().getTime();
            uData.unsubscribed_at = null;
          } else {
            uData.active = false;
            uData.unsubscribed_at = new Date().getTime();
          }

          await strapi.entityService.update('api::subscription.subscription', subscription.id, {
            data: uData
          });
        }

        // add new subscriptions for newly added channels
        for (const channel of data.channels) {
          const exists = subscriptions.some((item) => item.channel.id === channel);
          if (!exists) {
            await strapi.db.query('api::subscription.subscription').create({
              data: {
                active: true,
                channel,
                contact: contact_id,
                publishedAt: new Date().getTime()
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('ERROR:', error);
    }
  }
} 
