module.exports = ({ env }) => {
  const isTestRun = env('TEST_RUN', 'false') === 'true'; // Default to 'false' if TEST_RUN is not defined

  // Local/Test Email Configuration (Mailpit/Maildev)
  const testEmailConfig = {
    provider: 'nodemailer',
    providerOptions: {
      host: env('STRAPI_SMTP_HOST', 'localhost'), // Default local SMTP
      port: env.int('STRAPI_SMTP_PORT', 1025),    // Default Mailpit/Maildev port
      // No auth for local testing
    },
    settings: {
      defaultFrom: env('STRAPI_SMTP_DEFAULT_FROM', 'default@example.com'),
      defaultReplyTo: env('STRAPI_SMTP_DEFAULT_TO', 'default@example.com'),
    },
  };

  // Production Email Configuration (e.g., AWS SES)
  const prodEmailConfig = {
    provider: 'nodemailer',
    providerOptions: {
      host: env('STRAPI_SMTP_HOST', 'email-smtp.eu-central-1.amazonaws.com'),
      port: env.int('STRAPI_SMTP_PORT', 587),
      auth: {
        user: env('STRAPI_SMTP_USER', 'default@example.com'),
        pass: env('STRAPI_SMTP_PASS', 'example'),
      },
      // secure: false, // Enable if using port 465
    },
    settings: {
      defaultFrom: env('STRAPI_SMTP_DEFAULT_FROM', 'default@example.com'),
      defaultReplyTo: env('STRAPI_SMTP_DEFAULT_TO', 'default@example.com'),
    },
  };

  return {
    upload: {
      config: {
        provider: 'aws-s3',
        providerOptions: {
          s3Options: {
            accessKeyId: env('STRAPI_AWS_ACCESS_KEY_ID'),
            secretAccessKey: env('STRAPI_AWS_ACCESS_SECRET'),
            region: env('STRAPI_AWS_REGION'),
            params: {
              ACL: env('STRAPI_AWS_ACL', 'public-read'),
              signedUrlExpires: env('STRAPI_AWS_SIGNED_URL_EXPIRES', 15 * 60),
              Bucket: env('STRAPI_AWS_BUCKET'),
            },
          },
        },
        actionOptions: {
          upload: {},
          uploadStream: {},
          delete: {},
        },
      },
    },

    email: {
      config: isTestRun ? testEmailConfig : prodEmailConfig,
    },

    "fuzzy-search": {
      enabled: true,
      config: {
        contentTypes: [
          {
            uid: "api::article.article",
            modelName: "article",
            transliterate: true,
            fuzzysortOptions: {
              characterLimit: 300,
              threshold: 0.2,
              limit: 10,
              keys: [
                { name: "title", weight: 0.1 },
                { name: "description", weight: -0.1 },
                { name: "text", weight: -0.1 },
              ],
            },
          },
          {
            uid: "api::book.book",
            modelName: "book",
            fuzzysortOptions: {
              characterLimit: 500,
              keys: [
                { name: "name", weight: 0.2 },
              ],
            },
          },
        ],
      },
    },

    "users-permissions": {
      config: {
        register: {
          allowedFields: ["organization", "jwt_token"],
        },
        jwt: {
          expiresIn: '1y',
        },
        ratelimit: {
          interval: 60000,
          max: 100000,
        },
      },
    },
  };
};
