
export default ({ env }) => ({
        upload: {
          config: {
            provider: "aws-s3",
            providerOptions: {
              s3Options: {
                region: env("AWS_REGION"),
              credentials: {
                accessKeyId: env("AWS_ACCESS_KEY_ID"),
                secretAccessKey: env("AWS_SECRET_ACCESS_KEY"),
              },
              },
              params: {
                ACL: env("AWS_ACL", "public-read"),
                signedUrlExpires: env("AWS_SIGNED_URL_EXPIRES", 15 * 60),
                Bucket: env("AWS_BUCKET"),
              },
            },
            actionOptions: {
              upload: {},
              uploadStream: {},
              delete: {},
            },
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
      });
