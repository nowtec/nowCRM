// src/bootstrap/admin-and-tokens.ts
import type { Core } from "@strapi/strapi";


/**
 * Create SuperAdmin user if it doesn't exist.
 */
export async function createSuperAdminUserIfNotExist(
  strapi: Core.Strapi,
  email?: string,
  password?: string
): Promise<void> {
  try {
    const superAdminRole = await strapi.db
      .query("admin::role")
      .findOne({ where: { code: "strapi-super-admin" } });

    if (!superAdminRole) {
      throw new Error("SuperAdmin role not found");
    }

    const count = await strapi.db
      .query("admin::user")
      .count({ where: { roles: { id: superAdminRole.id } } });

    if (count === 0) {
      await strapi.service("admin::user").create({
        email: email || "techadmin@nowtec.solutions",
        password,
        firstname: "Super",
        lastname: "Admin",
        roles: [superAdminRole.id],
        isActive: true,
      });
      console.info("✅ SuperAdmin user created successfully");
      console.info(`🔑 Credentials: ${email} / ${password}`);
    } else {
      console.log("ℹ️ SuperAdmin user already exists");
    }
  } catch (error: any) {
    console.error("❌ Error creating SuperAdmin user:", error.message);
  }
}

/**
 * Create SuperAdmin user for testing (only runs with TEST_RUN=true)
 */
export async function createSuperAdminTest(
  strapi: Core.Strapi,
  email?: string,
  password?: string
): Promise<void> {
  if (!process.env.TEST_RUN || process.env.TEST_RUN === "false") {
    console.log("🧪 TEST_RUN=false, skipping SuperAdminTest creation");
    return;
  }

  console.log("🧪 TEST_RUN: CREATE SUPER ADMIN TEST");

  try {
    const superAdminRole = await strapi.db
      .query("admin::role")
      .findOne({ where: { code: "strapi-super-admin" } });

    if (!superAdminRole) throw new Error("SuperAdmin role not found");

    const count = await strapi.db
      .query("admin::user")
      .count({ where: { roles: { id: superAdminRole.id } } });

    if (count === 0) {
      await strapi.service("admin::user").create({
        email: email || process.env.STRAPI_TEST_ADMIN_EMAIL,
        password: password || process.env.STRAPI_TEST_ADMIN_PASSWORD,
        firstname: "Super",
        lastname: "Admin",
        roles: [superAdminRole.id],
        isActive: true,
      });
      console.log(`✅ Test SuperAdmin created (${email})`);
    } else {
      console.log("ℹ️ Test SuperAdmin already exists");
    }
  } catch (err: any) {
    console.error("❌ Error creating test SuperAdmin:", err.message);
  }
}

/**
 * Create full-access API token crm_journeys_dal_composer if not exists.
 */
export async function createCrmJourneysDalComposerToken(
  strapi: Core.Strapi
): Promise<void> {
  try {
    const tokenService = strapi.service("admin::api-token");

    if (!tokenService?.create) {
      console.warn("⚠️ Strapi API token service unavailable");
      return;
    }

    const exists = await tokenService.exists({
      name: "crm_journeys_dal_composer",
    });

    if (exists) {
      console.info(
        "ℹ️ API token 'crm_journeys_dal_composer' already exists — skipping"
      );
      return;
    }

    console.info("🔐 Creating 'crm_journeys_dal_composer' token...");
    const { accessKey } = await tokenService.create({
      name: "crm_journeys_dal_composer",
      type: "full-access",
      lifespan: null,
    });

    console.info("✅ CRM_JOURNEYS_DAL_COMPOSER_API_TOKEN=" + accessKey);
  } catch (err: any) {
    console.error("❌ Error creating crm_journeys_dal_composer token:", err);
  }
}

/**
 * Create test API tokens (test-admin & test-admin-composer)
 */
export async function createApiTokenTest(strapi: Core.Strapi): Promise<void> {
  if (!process.env.TEST_RUN || process.env.TEST_RUN === "false") {
    console.log("🧪 TEST_RUN=false, skipping API token creation");
    return;
  }

  try {
    const tokenService = strapi.service("admin::api-token");
    if (!tokenService?.create) {
      console.warn("⚠️ API token service unavailable");
      return;
    }

    console.log("🧪 TEST_RUN: creating test tokens...");

    const existingTest = await tokenService.exists({ name: "test-admin" });
    if (!existingTest) {
      const { accessKey } = await tokenService.create({
        name: "test-admin",
        type: "custom",
        lifespan: null,
        permissions: [
          "api::contact.contact.findOne",
          "api::contact.contact.find",
          "api::contact.contact.create",
          "api::contact.contact.update",
          "api::contact.contact.delete",
          "plugin::users-permissions.auth.callback",
          "plugin::users-permissions.auth.changePassword",
          "plugin::users-permissions.auth.resetPassword",
          "plugin::users-permissions.auth.connect",
          "plugin::users-permissions.auth.forgotPassword",
          "plugin::users-permissions.auth.register",
          "plugin::users-permissions.auth.emailConfirmation",
          "plugin::users-permissions.auth.sendEmailConfirmation",
          "plugin::users-permissions.user.create",
          "plugin::users-permissions.user.update",
          "plugin::users-permissions.user.find",
          "plugin::users-permissions.user.findOne",
          "plugin::users-permissions.user.count",
          "plugin::users-permissions.user.destroy",
          "plugin::users-permissions.user.me",
          "plugin::users-permissions.role.createRole",
          "plugin::users-permissions.role.findOne",
          "plugin::users-permissions.role.find",
          "plugin::users-permissions.role.updateRole",
          "plugin::users-permissions.role.deleteRole",
          "plugin::users-permissions.permissions.getPermissions",
          "api::form.form.duplicate",
          "api::form.form.formSubmit",
          "api::form.form.find",
          "api::form.form.findOne",
          "api::form.form.create",
          "api::form.form.update",
          "api::form.form.delete",
          "api::form-item.form-item.find",
          "api::form-item.form-item.findOne",
          "api::form-item.form-item.create",
          "api::form-item.form-item.update",
          "api::form-item.form-item.delete",
          "api::media-type.media-type.find",
          "api::media-type.media-type.findOne",
          "api::media-type.media-type.create",
          "api::media-type.media-type.update",
          "api::media-type.media-type.delete",
          "api::composition.composition.duplicate",
          "api::composition.composition.create",
          "api::composition.composition.findOne",
          "api::composition.composition.find",
          "api::composition.composition.delete",
          "api::composition.composition.update",
          "api::contact.contact.duplicate",
          "api::contact.contact.exportUserData",
          "api::contact.contact.anonymizeUserData",
          "api::contact.contact.bulkCreate",
          "api::contact.contact.bulkUpdate",
          "api::contact.contact.bulkDelete",
          "api::contact-interest.contact-interest.find",
          "api::contact-interest.contact-interest.findOne",
          "api::contact-interest.contact-interest.create",
          "api::contact-interest.contact-interest.update",
          "api::contact-interest.contact-interest.delete",
          "api::contact-type.contact-type.find",
          "api::contact-type.contact-type.findOne",
          "api::contact-type.contact-type.create",
          "api::contact-type.contact-type.update",
          "api::contact-type.contact-type.delete",
          "api::department.department.find",
          "api::department.department.findOne",
          "api::department.department.create",
          "api::department.department.update",
          "api::department.department.delete",
          "api::contact-job-title.contact-job-title.find",
          "api::contact-job-title.contact-job-title.findOne",
          "api::contact-job-title.contact-job-title.create",
          "api::contact-job-title.contact-job-title.update",
          "api::contact-job-title.contact-job-title.delete",
          "api::frequency.frequency.find",
          "api::frequency.frequency.findOne",
          "api::frequency.frequency.create",
          "api::frequency.frequency.update",
          "api::frequency.frequency.delete",
          "api::keyword.keyword.find",
          "api::keyword.keyword.findOne",
          "api::keyword.keyword.create",
          "api::keyword.keyword.update",
          "api::keyword.keyword.delete",
          "api::list.list.activeContactsCount",
          "api::list.list.duplicate",
          "api::list.list.find",
          "api::list.list.findOne",
          "api::list.list.create",
          "api::list.list.update",
          "api::list.list.delete",
          "api::contact-note.contact-note.find",
          "api::contact-note.contact-note.findOne",
          "api::contact-note.contact-note.create",
          "api::contact-note.contact-note.update",
          "api::contact-note.contact-note.delete",
          "api::organization.organization.duplicate",
          "api::organization.organization.find",
          "api::organization.organization.findOne",
          "api::organization.organization.create",
          "api::organization.organization.update",
          "api::organization.organization.delete",
          "api::organization-type.organization-type.find",
          "api::organization-type.organization-type.findOne",
          "api::organization-type.organization-type.create",
          "api::organization-type.organization-type.update",
          "api::organization-type.organization-type.delete",
          "api::contact-rank.contact-rank.find",
          "api::contact-rank.contact-rank.findOne",
          "api::contact-rank.contact-rank.create",
          "api::contact-rank.contact-rank.update",
          "api::contact-rank.contact-rank.delete",
          "api::source.source.find",
          "api::source.source.findOne",
          "api::source.source.create",
          "api::source.source.update",
          "api::source.source.delete",
          "api::subscription.subscription.find",
          "api::subscription.subscription.findOne",
          "api::subscription.subscription.create",
          "api::subscription.subscription.update",
          "api::subscription.subscription.delete",
          "api::subscription-type.subscription-type.find",
          "api::subscription-type.subscription-type.findOne",
          "api::subscription-type.subscription-type.create",
          "api::subscription-type.subscription-type.update",
          "api::subscription-type.subscription-type.delete",
        ],
      });
      console.info(`✅ Created TEST API token: CRM_STRAPI_API_TOKEN=${accessKey}`);
    } else {
      console.log("ℹ️ 'test-admin' token already exists");
    }

    const existingComposer = await tokenService.exists({
      name: "test-admin-composer",
    });

    if (!existingComposer) {
      const { accessKey } = await tokenService.create({
        name: "test-admin-composer",
        type: "full-access",
        lifespan: null,
      });
      console.info(`✅ Created COMPOSER_STRAPI_API_TOKEN=${accessKey}`);
    } else {
      console.log("ℹ️ 'test-admin-composer' token already exists");
    }
  } catch (err: any) {
    console.error("❌ Error creating test API tokens:", err.message);
  }
}

/**
 * Create Users-Permissions admin user once.
 * Uses STRAPI_STANDART_EMAIL for username and email.
 * Logs credentials only on the first creation.
 */
export async function createUsersPermissionsAdminIfNotExist(
  strapi: Core.Strapi,
  email: string,
  password: string
): Promise<void> {
  try {
    // find Admin role created in createAdminRole()
    const adminRole = await strapi.db
      .query("plugin::users-permissions.role")
      .findOne({ where: { name: "Admin" } })

    if (!adminRole) {
      console.error("Users-Permissions Admin role not found. createAdminRole() must run before.")
      return
    }

    // check if user exists
    const existing = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({
        where: { email }
      })

    if (existing) {
      console.log(`U&P Admin user (${email}) already exists`)
      return
    }

    // create new Users-Permissions admin user
    await strapi.db.query("plugin::users-permissions.user").create({
      data: {
        username: email,
        email,
        password,
        confirmed: true,
        blocked: false,
        role: adminRole.id
      }
    })

    console.info("✔ Users-Permissions Admin user created")
    console.info(`🔑 U&P Admin (username=email): ${email} ${password} role=Admin`)

  } catch (err: any) {
    console.error("❌ Error creating U&P Admin user:", err.message)
  }
}