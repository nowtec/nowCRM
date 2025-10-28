const axios = require('axios');
const { getUpdateDifferences } = require('../../functions/getUpdateDifferences');
const { v4: uuidv4 } = require('uuid');

module.exports = {
	beforeCreate: async ({ params }) => {
		params.data.unsubscribe_token = uuidv4();
		const consent = await strapi.db.query('api::consent.consent').findOne({
		  select: ['id', 'version'],
		  where: { active: true },
		  orderBy: { updatedAt: 'DESC' }
		});
	  
		if (consent && consent.id) {
		  params.data.consent = consent.id;
		} else {
		  console.warn('No active consent record found. Proceeding without consent assignment.');
		  // Optionally assign a default value or leave it undefined
		  // params.data.consent = defaultConsentValue;
		}
	  },

	beforeUpdate: async ({params, state}) => {
		try {

			//--- insert log ---
			let action = "Modified";
			let description = ""; 
			let users_permissions_user = null;
			if(params.data.updatedBy !== null && params.data.updatedBy > 0){
				description += `(from Strapi UI by user: ${params.data.updatedBy}) `;
			} else if(params.data.user_token !== undefined && params.data.user_token.length){
				const jwtUser_b64 = params.data.user_token.split('.')[1];
				const jwtUser = JSON.parse(atob(jwtUser_b64));
				users_permissions_user = jwtUser.id;
				delete params.data.user_token;
			}
			const diff = await getUpdateDifferences(params);
			if( diff && Object.keys(diff).length) {

				description += "Affected fields: " + JSON.stringify(diff);
				
				const log = await strapi.db.query('api::activity-log.activity-log').create({
					data: {
						action: action,
						description: description,
						users_permissions_user: users_permissions_user,
						contact: params.data.id || params.where.id,
						publishedAt: new Date().getTime()
					}
				});
			};


			//--- insert subscriptions ---
			if(params.data?.channels) {
				const contact_id = params.data.id || params.where.id
				const subscriptions = await strapi.db.query('api::subscription.subscription').findMany({
					where: {
						contact: {
							id: contact_id
						}
					},
					populate: ['channel']
				});
				for(const subscription of subscriptions){
					const uData = {};
					if(params.data.channels.includes(subscription.channel.id)){
						uData.active = true;
						uData.subscribed_at = new Date().getTime()
						uData.unsubscribed_at = null
					} else {
						uData.active = false;
						uData.unsubscribed_at =  new Date().getTime()
					}
					await strapi.entityService.update('api::subscription.subscription', subscription.id, {
						data: uData
					});
				}
				for(const channel of params.data.channels){
					const exists = subscriptions.some(item => item.channel.id === channel);
					if(!exists){
						const entry = await strapi.db.query('api::subscription.subscription').create({
							data: {
								active: true,
								channel: channel,
								contact: contact_id,
								publishedAt: new Date().getTime()
							}
						});
					}
				}

			}

		} catch(error) {
			console.log('ERROR:', error)
		}
	}

}