const path = require('path');

module.exports = ({ env }) => {
  const isRds = env('STRAPI_DATABASE_RDS', 'false') === 'true';

  return {
    connection: {
      client: 'postgres',
      connection: {
        host: env('STRAPI_DATABASE_HOST', 'localhost'),
        port: env.int('STRAPI_DATABASE_PORT', 5432),
        database: env('STRAPI_DATABASE_NAME', 'bank'),
        user: env('STRAPI_DATABASE_USERNAME', 'postgres'),
        password: env('STRAPI_DATABASE_PASSWORD', '0000'),
        schema: env('DATABASE_SCHEMA', 'public'),
        ssl: isRds ? { rejectUnauthorized: env.bool('STRAPI_DATABASE_SSL_SELF', false) } : false,
      },
      pool: {
        min: 5,
        max: isRds ? 50 : 500,
        acquireTimeoutMillis: 60000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 500,
      },
      debug: false,
    },
  };
};
