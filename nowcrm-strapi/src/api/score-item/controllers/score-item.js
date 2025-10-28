'use strict';

/**
 * score-item controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::score-item.score-item', ({strapi}) => ({

    async getScoreAgregations(ctx){

        const { body } = ctx.request;

        if(!body.contact) {
            ctx.response.status = 400; 
            ctx.response.body = { error: 'No Contact found' };
            return;
        }

        const options = {
            select: [ 'id', 'value' ],
            filters: {
                ...body.filters,
                action: {
                    contact: body.contact
                }
            }
        }
        const entities = await strapi.db.query('api::score-item.score-item').findMany(options);
        const values = entities.map(item => item.value).filter(item => item);
        const sum = values.reduce((acc, val) => acc + val, 0);
        return {
            min: Math.min(...values),
            max: Math.max(...values),
            sum: sum,
            avg: sum / values.length
        }
    }


}));
