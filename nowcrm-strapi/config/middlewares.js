module.exports = [
  'strapi::errors',

  //'strapi::security',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            `${process.env.STRAPI_AWS_BUCKET}.s3.${process.env.STRAPI_AWS_REGION}.amazonaws.com`,
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            `${process.env.STRAPI_AWS_BUCKET}.s3.${process.env.STRAPI_AWS_REGION}.amazonaws.com`,
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },

  'strapi::poweredBy',

  // 'strapi::cors',
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      origin: (origin) => {
        if (!origin) return true; // allow same-origin or tools like curl
        const allowedPatterns = [
          /^https?:\/\/localhost(:\d+)?$/,
          /^https?:\/\/.*\.?[\w-]+\.ch$/,
          /^https?:\/\/.*\.?[\w-]+\.org$/,
          /^https?:\/\/.*\.?[\w-]+\.solutions$/,
        ];
        return allowedPatterns.some((pattern) => pattern.test(origin));
      },
      headers: '*',
    },
  },
  // 'strapi::body',
  {
    name: "strapi::body",
    config: {
      formLimit: "100mb", // modify form body
      jsonLimit: "100mb", // modify JSON body
      textLimit: "100mb", // modify text body
      formidable: {
        maxFileSize: 100 * 1024 * 1024, // multipart data, modify here limit of uploaded file size
      },
    },
  },
  'strapi::logger',
  'strapi::query',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];