
module.exports = {

	beforeUpdate: async ({params, state}) => {

        const organizationId = params.data.id || params.where.id;
        const entity = await strapi.db.query('api::organization.organization').findOne({
            where: { id: organizationId }
        });
        if(entity.publishedAt !== null && params.data.publishedAt === null) {
            console.log('in if')
            const contacts = await strapi.db.query('api::contact.contact').findMany({
                where: { 
                    organization: organizationId
                }
            });
            console.log(contacts);
            if(contacts) {
                for(const contact of contacts){
                    await strapi.db.query('api::contact.contact').update({
                        where: {
                            organization: organizationId
                        },
                        data: {
                            organization: null
                        }
                    });
                }
            }
        }

	}

}