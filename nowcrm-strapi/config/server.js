module.exports = ({ env }) => ({
  host: env('STRAPI_HOST', '0.0.0.0'),
  port: env.int('STRAPI_PORT', 1337),
  url: env('STRAPI_URL', process.env.STRAPI_BACKEND_ORIGIN),
  app: {
    keys: env.array('STRAPI_APP_KEYS'),
  },
});
