const {CONFIG} = require('./config')

const name = "Journeys webhook";

async function setUpJourneysWebhook(strapi){
  const webhookStore =
    "webhookStore" in strapi
      ? strapi.webhookStore // v4
      : await strapi.get("webhookStore"); // v5

  try {
    const webhooks = await webhookStore.findWebhooks();
    const oldWebhook = webhooks.find((webhook) => webhook.name === name);
    if (oldWebhook) {
      /**
       * Reason why we recreate each time webhook on reset strapi is there might be case when host
      */
      console.log(`Removing old ${oldWebhook.name} webhook...`);
      await webhookStore.deleteWebhook(oldWebhook.id);
      console.log(`Old ${oldWebhook.name} webhook removed.`);
    } else {
      console.log(`${name} does not exist yet.`);
    }
  } catch (error) {
    console.error(`Unable to prepare "${name}" webhook`, error);
  }

  try {
    await webhookStore.createWebhook({
      events: ['entry.create', 'entry.update','entry.delete','entry.publish','entry.unpublish'],
      isEnabled: true,
      name,
      url: CONFIG.NODE_ENV.toLowerCase() === 'development' ?
      `http://${CONFIG.JOURNEYS_HOST}:${CONFIG.JOURNEYS_PORT}/webhooks/trigger` :
      `https://${CONFIG.JOURNEYS_HOST}.${CONFIG.CUSTOMER_DOMAIN}/webhooks/trigger`
    });
    console.log(`${name} webhook created.`);
  } catch (error) {
    console.error(`Unable to create "${name}" webhook`, error);
  }
};
module.exports = {
  setUpJourneysWebhook,
};
