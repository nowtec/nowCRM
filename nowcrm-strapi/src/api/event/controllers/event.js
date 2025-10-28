'use strict';

/**
 * event controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::event.event', ({strapi}) => ({

    async getEventChartData(ctx) {

        const table = 'events';
        const field = (ctx.query.type) ? ctx.query.type : 'action';
        const where_field = 'destination';
        const response = {
            success: false,
            type: field,
            data: [],
            legend: []
        }
        try {
            if(!ctx.query || !ctx.query['contactId']){
                response.error = "No contactId found"
                return response;
            }
            const contactId = ctx.query['contactId'];
            const contact = await strapi.query('api::contact.contact').findOne({ where: { id: contactId }, });
            let query = `SELECT ${field}, COUNT(*) AS count FROM ${table} WHERE ${where_field} = '${contact.email}'`;
            if(contact.phone) query += ` OR ${where_field} = '${contact.phone}'`;
            query += `GROUP BY ${field}`;

            const { rows } = await strapi.db.connection.raw(query);
            for(const row of rows){
                response.data.push({
                    name: row[field],
                    value: row['count']
                });
                response.legend.push(row[field])
            }
            response.success = true
        } catch(error){
            response.error = error.message
        } finally {
            return response
        }
    },

    async getCompositionChannelData(ctx) {
        if(!ctx.request.body.composition) {
            return {
                success: false,
                error: "Composition not found"
            }
        }
        const compositionId = ctx.request.body.composition;
        const emails = await strapi.query('api::event.event').count({
            where: {
                action: 'Open',
                status: "Received",
                composition: compositionId
            }
        });
        const sms = await strapi.query('api::event.event').count({
            where: {
                source: {
                    $eqi: 'SMS'
                },
                composition: compositionId
            }
        });
        const twitter = await strapi.query('api::event.event').count({
            where: {
                source: {
                    $eqi: 'Twitter'
                },
                composition: compositionId
            }
        });
        const telegram = await strapi.query('api::event.event').count({
            where: {
                source: {
                    $eqi: 'Telegram'
                },
                composition: compositionId
            }
        });
        const linkedin = await strapi.query('api::event.event').count({
            where: {
                source: {
                    $eqi: 'LinkedIn'
                },
                composition: compositionId
            }
        });
        const whatsapp = await strapi.query('api::event.event').count({
            where: {
                source: {
                    $eqi: 'WhatsApp'
                },
                composition: compositionId
            }
        });
        return {
            emails: emails,
            sms: sms,
            twitter: twitter,
            telegram: telegram,
            linkedin: linkedin,
            whatsapp: whatsapp,
        }
    },

    async trackEvent(ctx) {
        const { body } = ctx.request
        const findKey = (obj, key) => {
            for (let k in obj) {
                if (obj[k] && typeof obj[k] === 'object') {
                    return findKey(obj[k], key);
                } else {
                    if (k === key) return obj[k];
                }
            }
        }

        const email         = findKey(body, 'email');
        const compositionId = findKey(body, 'compositionId');
        let contact = null;
        if(email){
            contact = await strapi.db.query('api::contact.contact').findOne({
                where: {
                    email: email
                }
            });
        }
       
        const event  = await strapi.db.query('api::event.event').create({ 
            data: {
                ...body,
                ...body?.urlParameters,
                contact: contact,
                composition: compositionId,
                payload: JSON.stringify(body),
                publishedAt: new Date().getTime()
            }
        });
        return {
            success: true,
            event: event
        }
    }

}));
