
module.exports = {

	afterCreate: async ({result, params}) => {

        const notificationData = {
            task: result.id,
            due_date: result.due_date,
            publishedAt: result.publishedAt
        }
		const notification = await strapi.db.query('api::notification.notification').create({ data: notificationData });
	},

    afterUpdate: async ({result, params}) => {

		const notification = await strapi.db.query('api::notification.notification').findOne({
            where: {
                task: {
                    id: result.id
                }
            }
        });
        if(notification){
            notification.publishedAt = result.publishedAt;
            const entry = await strapi.entityService.update('api::notification.notification', notification.id, {
                data: notification,
            });
        } else {
            const notificationData = {
                task: result.id,
                due_date: result.due_date,
                publishedAt: result.publishedAt
            }
            const entry = await strapi.db.query('api::notification.notification').create({ data: notificationData });
        }

	}
	
}