const { v4: uuidv4 } = require('uuid');

module.exports = {

	beforeCreate: async ({result, params}) => {
		params.data.subscribed_at = new Date().getTime()
        params.data.unsubscribe_token = uuidv4();

        if(!params.data.consent || !params.data.consent.connect.length) {
            const consent = await strapi.db.query('api::consent.consent').findOne({
                select: ['id', 'version'],
                where: { active: true },
                orderBy: { updatedAt: 'DESC' }
            });
            if(consent) {
                params.data.consent = {connect: [consent.id] };
            }
        }

        if(!params.data.subscription_type || !params.data.subscription_type?.connect?.length){
            const type = await strapi.db.query('api::subscription-type.subscription-type').findOne({
                select: ['id'],
                orderBy: { id: 'ASC' }
            });
            if(type) {
                params.data.subscription_type = { connect: [type.id] };
            }
        }
	},

}