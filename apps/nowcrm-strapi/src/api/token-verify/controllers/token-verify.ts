/**
 * token-verify controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::token-verify.token-verify', ({ strapi }) => ({
  async verify(ctx) {
    try {
      const authHeader = ctx.request.headers.authorization;

      if (!authHeader) {
        return ctx.badRequest('Authorization header is missing');
      }

      // Extract token from "Bearer <token>" format
      const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
      if (!tokenMatch) {
        return ctx.badRequest('Invalid authorization header format. Expected: Bearer <token>');
      }

      const token = tokenMatch[1];

      // 1) Verify as user token by verifying JWT and checking user exists
      let userTokenValid = false;
      let userData = null;
      try {
        // Verify JWT token using Strapi's JWT service
        const jwtService = strapi.plugin('users-permissions').service('jwt');
        const decodedToken = await jwtService.verify(token);

        if (decodedToken && decodedToken.id) {
          // Token is valid JWT, verify user exists (simulating /users/me check)
          const user = await strapi.db.query('plugin::users-permissions.user').findOne({
            where: { id: decodedToken.id },
            select: ['id', 'email', 'username', 'confirmed', 'blocked'],
          });

          if (user && !user.blocked && user.confirmed) {
            userTokenValid = true;
            userData = {
              id: user.id,
              email: user.email,
              username: user.username,
            };
          }
        }
      } catch (userError) {
        // Token is not a valid user JWT token
        userTokenValid = false;
      }

      // 2) Verify as API token
      let apiTokenValid = false;
      let apiTokenData = null;
      try {
        const apiTokenService = strapi.service('admin::api-token');
        const matchingToken = await apiTokenService.getBy({
          accessKey: apiTokenService.hash(token),
        });

        // A token past its lifespan stays in the table, so expiry is checked here.
        const expired =
          matchingToken?.expiresAt != null &&
          new Date(matchingToken.expiresAt).getTime() <= Date.now();

        if (matchingToken && !expired) {
          apiTokenValid = true;
          apiTokenData = {
            id: matchingToken.id,
            name: matchingToken.name,
            type: matchingToken.type,
          };
        }
      } catch (apiError) {
        // Token is not a valid API token
        apiTokenValid = false;
      }

      // Return verification results
      return ctx.send({
        success: true,
        token: token.substring(0, 10) + '...', // Only show first 10 chars for security
        verification: {
          userToken: {
            valid: userTokenValid,
            data: userData,
          },
          apiToken: {
            valid: apiTokenValid,
            data: apiTokenData,
          },
        },
      });
    } catch (error) {
      console.error('Token verification error:', error);
      return ctx.send(
        {
          success: false,
          message: 'Failed to verify token',
          error: error?.message || 'Unknown error',
        },
        500
      );
    }
  },
}));
