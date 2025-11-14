import path from 'path';
import fs from 'fs';
import type { Core } from '@strapi/strapi';
import { generatePassword } from './bootstrap/utils/generatePassword';
import { seedData } from './bootstrap/data/seedData';
import industriesData from "./bootstrap/data/industries.json";
import { createUsersPermissionsAdminIfNotExist } from './bootstrap/admin-and-tokens'
import {
  ensureLocalesAndConsents,
  populateStartupEntry,
  seedEntities,
  seedLinkedEntitiesForTempUsers,
  seedCommonEntities,
} from './bootstrap/seeding';
import {
  cleanupPermissions,
  createAdminRole,
} from './bootstrap/roles';
import {
  createSuperAdminUserIfNotExist,
  createSuperAdminTest,
  createApiTokenTest,
  createCrmJourneysDalComposerToken,
} from './bootstrap/admin-and-tokens';
import { setUpJourneysWebhook } from './bootstrap/create-journeys-webhooks';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    (async () => {
      const publishedAt = Date.now();

      // --- ensure locales etc ---
      await ensureLocalesAndConsents(strapi);

      // --- seed data ---
      await import('./bootstrap/bootstrapService')
        .then(({ bootstrapData }) => bootstrapData(strapi, seedData, publishedAt));

      // --- read & seed industries ---
      await populateStartupEntry(strapi, 'api::industry.industry', industriesData);

      // --- link entities ---
      const tempEmails = seedData.contact.map(c => c.email);
      const existingActions = await strapi.db.query('api::action.action').count({
        where: { contact: { email: { $in: tempEmails } } },
      });

      if (existingActions === 0) {
        await seedLinkedEntitiesForTempUsers(strapi);
      } else {
        console.log('Skipping seedLinkedEntitiesForTempUsers – already seeded.');
      }

      // --- setup roles, users, and tokens ---
      await cleanupPermissions(strapi)
      await createAdminRole(strapi)

      const upPassword = generatePassword()

      await createUsersPermissionsAdminIfNotExist(
        strapi,
        process.env.STRAPI_STANDART_EMAIL!,
        upPassword
      )
      
      console.log("CRM_ADMIN_PASSWORD:", upPassword)

      if (process.env.NT_ACTIVE_SERVICES?.includes('journeys')) {
        setUpJourneysWebhook(strapi);
      }

      // check if super-admin already exists
      const superAdminRole = await strapi.db
        .query("admin::role")
        .findOne({ where: { code: "strapi-super-admin" } });

      const existingSuperAdmins = await strapi.db
        .query("admin::user")
        .count({ where: { roles: { id: superAdminRole!.id } } });

      if (existingSuperAdmins === 0) {
        const adminPassword = generatePassword();
        await createSuperAdminUserIfNotExist(
          strapi,
          process.env.STRAPI_STANDART_EMAIL!,
          adminPassword
        );
        console.log(`STRAPI_ADMIN_PASSWORD: ${adminPassword}`);
      } else {
        console.log("SuperAdmin already exists. Skipping password generation.");
      }

      await createSuperAdminTest(
        strapi,
        process.env.STRAPI_TEST_ADMIN_EMAIL!,
        process.env.STRAPI_TEST_ADMIN_PASSWORD!
      );

      await createApiTokenTest(strapi);
      await createCrmJourneysDalComposerToken(strapi);

      seedCommonEntities(strapi);
      seedEntities(strapi);
    })().catch((err) => {
      console.error('Error during bootstrap:', err);
    });
  },
};
