// src/bootstrap/roles.ts
import type { Core } from "@strapi/strapi";

/**
 * Assign permissions to a role.
 */
export async function assignRolePermissions(
  strapi: Core.Strapi,
  roleId: number,
  permissions: Record<string, string[]>
): Promise<void> {
  try {
    // remove old permissions
    await strapi.db
      .query("plugin::users-permissions.permission")
      .deleteMany({ where: { role: roleId } });

    for (const [subject, actions] of Object.entries(permissions)) {
      for (const action of actions) {
        await strapi.db
          .query("plugin::users-permissions.permission")
          .create({
            data: {
              action: `${subject}.${action}`,
              role: roleId,
            },
          });
      }
    }

    console.log(`permissions updated for role ${roleId}`);
  } catch (err) {
    console.error("permission assignment error:", err);
  }
}

/**
 * Clean up permissions containing "::"
 */
export async function cleanupPermissions(strapi: Core.Strapi): Promise<void> {
  try {
    await strapi.db
      .query("plugin::users-permissions.permission")
      .deleteMany({ where: { action: { $contains: "::" } } });

    console.log("old permissions cleaned");
  } catch (err) {
    console.error("cleanup failed:", err);
  }
}

/**
 * Create ReadOnly role
 */
export async function createReadonlyRole(strapi: Core.Strapi): Promise<void> {
  const readonlyPermissions: Record<string, string[]> = {
    "api::activity-log.activity-log": ["find", "findOne"],
    "api::campaign.campaign": ["find", "findOne"],
    "api::campaign-category.campaign-category": ["find", "findOne"],
    "api::composition.composition": ["create", "find", "findOne", "update"],
    "api::composition-new.composition-new": ["create", "find", "findOne", "update"],
    "api::consent.consent": ["findOne"],
    "api::contact.contact": ["findOne", "find", "findAll", "importCSV"],
    "api::contact-interest.contact-interest": ["find", "findOne"],
    "api::contact-title.contact-title": ["find", "findOne"],
    "api::contact-salutation.contact-salutation": ["find", "findOne"],
    "api::department.department": ["find", "findOne"],
    "api::contact-job-title.contact-job-title": ["find", "findOne"],
    "api::donation-subscription.donation-subscription": ["find", "findOne"],
    "api::donation-transaction.donation-transaction": ["find", "findOne"],
    "api::event.event": ["find", "findOne"],
    "api::frequency.frequency": ["find", "findOne"],
    "api::keyword.keyword": ["find", "findOne"],
    "api::list.list": ["find", "findOne", "create", "pushToPinpoint"],
    "api::media-type.media-type": ["find", "findOne"],
    "api::notification.notification": ["find", "findOne", "create", "update"],
    "api::organization.organization": ["find", "findOne"],
    "api::search-history.search-history": ["find", "findOne", "create", "delete", "update"],
    "api::survey.survey": ["find", "findOne"],
    "api::survey-item.survey-item": ["find", "findOne"],
    "api::task.task": ["find", "findOne", "create"],
    "api::text-block.text-block": ["find", "findOne", "create"],
    "api::contact-type.contact-type": ["find", "findOne"],
    "api::organization-type.organization-type": ["find", "findOne"],
    "api::subscription-type.subscription-type": ["find", "findOne"],
    "api::subscription.subscription": [
      "find",
      "findOne",
      "update",
      "create",
      "createContact",
      "unsubscribe",
    ],
    "plugin::upload.content-api": ["find", "findOne", "upload"],
    "plugin::users-permissions.auth": [
      "connect",
      "forgotPassword",
      "emailConfirmation",
      "sendEmailConfirmation",
      "resetPassword",
      "changePassword",
      "callback",
    ],
  };

  try {
    const existing = await strapi.db
      .query("plugin::users-permissions.role")
      .findOne({ where: { name: "ReadOnly" } });

    if (!existing) {
      const role = await strapi.db
        .query("plugin::users-permissions.role")
        .create({
          data: {
            name: "ReadOnly",
            type: "readonly",
            description: "read only role",
          },
        });

      console.log("readonly role created");

      await assignRolePermissions(strapi, role.id, readonlyPermissions);
    }
  } catch (err) {
    console.error("readonly role error:", err);
  }
}

/**
 * Create Admin role with all permissions
 */
export async function createAdminRole(strapi: Core.Strapi): Promise<void> {
  const basic = ["find", "findOne", "create", "update", "delete"];
  const basicLoc = [...basic, "createLocalization"];
  const basicNoDel = ["find", "findOne", "create", "update"];
  const basicNoDelNoUpd = ["find", "findOne", "create"];

  const adminPermissions: Record<string, string[]> = {
    "api::action.action": basic,
    "api::action-type.action-type": basic,
    "api::activity-log.activity-log": basic,
    "api::category.category": basicLoc,
    "api::channel.channel": basic,
    "api::composition.composition": [...basic, "duplicate"],
    "api::composition-item.composition-item": basic,
    "api::composition-prompt.composition-prompt": basic,
    "api::composition-template.composition-template": basic,
    "api::composition-template-group.composition-template-group": basic,
    "api::consent.consent": [...basicLoc, "getCRMVersion"],
    "api::contact.contact": [
      ...basicLoc,
      "anonymizeUserData",
      "exportUserData",
      "duplicate",
      "bulkCreate",
      "bulkUpdate",
      "bulkDelete",
    ],
    "api::contact-interest.contact-interest": basic,
    "api::contact-title.contact-title": basic,
    "api::contact-salutation.contact-salutation": basic,
    "api::contact-type.contact-type": basic,
    "api::department.department": basic,
    "api::action-score-item.action-score-item": basic,
    "api::campaign.campaign": basic,
    "api::campaign-category.campaign-category": basic,
    "api::composition-scheduled.composition-scheduled": basic,
    "api::contact-document.contact-document": basic,
    "api::media-type.media-type": basic,
    "api::contact-job-title.contact-job-title": basic,
    "api::document.document": [...basic, "createLNCertificate", "createLNNavigator"],
    "api::donation-subscription.donation-subscription": basic,
    "api::donation-transaction.donation-transaction": basic,
    "api::event.event": [...basic, "getCompositionChannelData", "trackEvent", "getEventChartData"],
    "api::tag.tag": basic,
    "api::form.form": [...basic, "formSubmit", "duplicate"],
    "api::form-item.form-item": basic,
    "api::frequency.frequency": basic,
    "api::identity.identity": basic,
    "api::industry.industry": basic,
    "api::journey.journey": [...basic, "duplicate"],
    "api::journey-passed-step.journey-passed-step": basic,
    "api::journey-step.journey-step": basic,
    "api::journey-step-rule.journey-step-rule": basic,
    "api::journey-step-rule-score.journey-step-rule-score": basic,
    "api::journey-step-connection.journey-step-connection": basic,
    "api::keyword.keyword": basic,
    "api::list.list": [...basic, "activeContactsCount", "duplicate"],
    "api::manual-entry.manual-entry": basic,
    "api::contact-note.contact-note": basic,
    "api::organization.organization": [...basic, "duplicate"],
    "api::organization-type.organization-type": basic,
    "api::contact-rank.contact-rank": basic,
    "api::search-history.search-history": basic,
    "api::search-history-template.search-history-template": basic,
    "api::setting.setting": basic,
    "api::setting-credential.setting-credential": basic,
    "api::source.source": basic,
    "api::subscription.subscription": [...basic, "unsubscribe", "createContact"],
    "api::subscription-type.subscription-type": basic,
    "api::survey.survey": basic,
    "api::survey-item.survey-item": basic,
    "api::task.task": basic,
    "api::tax.tax": basic,
    "api::unipile-identity.unipile-identity": basic,
    "api::text-block.text-block": basicLoc,
    "plugin::i18n.locales": ["listLocales"],
    "plugin::fuzzy-search.searchcontroller": ["search"],
    "plugin::upload.content-api": ["find", "findOne", "upload", "destroy"],
    "plugin::users-permissions.auth": [
      "connect",
      "forgotPassword",
      "emailConfirmation",
      "sendEmailConfirmation",
      "resetPassword",
      "changePassword",
      "callback",
    ],
    "plugin::users-permissions.permissions": ["getPermissions"],
    "plugin::users-permissions.role": [
      "createRole",
      "deleteRole",
      "find",
      "findOne",
      "updateRole",
    ],
    "plugin::users-permissions.user": [
      "count",
      "create",
      "destroy",
      "find",
      "findOne",
      "me",
      "update",
    ],
  };

  try {
    let admin = await strapi.db
      .query("plugin::users-permissions.role")
      .findOne({ where: { name: "Admin" } });

    if (!admin) {
      admin = await strapi.db
        .query("plugin::users-permissions.role")
        .create({
          data: {
            name: "Admin",
            type: "admin",
            description: "full access",
          },
        });

      console.log("admin role created");
    }

    await assignRolePermissions(strapi, admin.id, adminPermissions);
  } catch (err) {
    console.error("admin role error:", err);
  }
}
