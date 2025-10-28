if(process.env.NT_ACTIVE_SERVICES && process.env.NT_ACTIVE_SERVICES.includes("journeys")){
  if (!process.env.JOURNEYS_PORT || !process.env.JOURNEYS_HOST) {
    throw new Error("Missing environment variables for setting up webhooks");
  }
  if(!process.env.CUSTOMER_DOMAIN){
    throw new Error("Missing customer domain");
  }

  const CONFIG = {
    NODE_ENV: process.env.NODE_ENV,
    CUSTOMER_DOMAIN: process.env.CUSTOMER_DOMAIN,
    JOURNEYS_PORT: process.env.JOURNEYS_PORT,
    JOURNEYS_HOST: process.env.JOURNEYS_HOST,
  };

  module.exports = { CONFIG };
}