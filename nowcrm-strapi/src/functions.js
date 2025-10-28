
/**
 * create Readonly role with permissions
 * @param {object} strapi - The strapi object.
 */

function createReadonlyRole(strapi) {
  const readonly_permissions = {
    'api::activity-log.activity-log': ['find', 'findOne',],
    'api::campaign.campaign': ['find', 'findOne'],
    'api::campaign-category.campaign-category': ['find', 'findOne'],
    'api::composition.composition': ['create', 'find', 'findOne', 'update'],
    'api::composition-new.composition-new': ['create', 'find', 'findOne', 'update',],
    'api::consent.consent': ['findOne'],
    'api::contact.contact': ['findOne', 'find', 'findAll', 'importCSV'],
    'api::contact-extra-field.contact-extra-field': ['find', 'findOne'],
    'api::contact-interest.contact-interest': ['find', 'findOne'],
    'api::contact-title.contact-title': ['find', 'findOne'],
    'api::contact-salutation.contact-salutation': ['find', 'findOne'],
    'api::department.department': ['find', 'findOne'],
    'api::job-title.job-title': ['find', 'findOne'],
    'api::donation-subscription.donation-subscription': ['find', 'findOne'],
    'api::donation-tranaction.donation-tranaction': ['find', 'findOne'],
    'api::event.event': ['find', 'findOne'],
    'api::frequency.frequency': ['find', 'findOne'],
    'api::keyword.keyword': ['find', 'findOne'],
    'api::list.list': ['find', 'findOne', 'create', 'pushToPinpoint'],
    'api::media-type.media-type': ['find', 'findOne'],
    'api::notification.notification': ['find', 'findOne', 'create', 'update'],
    'api::organization.organization': ['find', 'findOne'],
    'api::search-history.search-history': ['find', 'findOne', 'create', 'delete', 'update'],
    'api::survey.survey': ['find', 'findOne'],
    'api::survey-item.survey-item': ['find', 'findOne'],
    'api::task.task': ['find', 'findOne', 'create'],
    'api::text-block.text-block': ['find', 'findOne', 'create'],
    'api::contact-type.contact-type': ['find', 'findOne'],
    'api::organization-type.organization-type': ['find', 'findOne'],
    'api::subscription-type.subscription-type': ['find', 'findOne'],
    'api::subscription.subscription': ['find', 'findOne', 'update', 'create', 'createContact', 'unsubscribe'],
    'plugin::upload.content-api': ['find', 'findOne', 'upload'],
    'plugin::users-permissions.auth': ['connect', 'forgotPassword', 'emailConfirmation', 'sendEmailConfirmation', 'resetPassword', 'changePassword', 'callback']
  }

  strapi.db.query('plugin::users-permissions.role').findOne({ where: { name: 'ReadOnly' } }).then(response => {
    if (!response) {
      strapi.db.query('plugin::users-permissions.role').create({
        data: {
          name: 'ReadOnly',
          type: 'readonly',
          description: 'This user has read only role',
        }
      }).then(role_response => {
        console.log('READONLY ROLE CREATED')
        assignRolePermissions(strapi, role_response.id, readonly_permissions);
      }) //end-then-role
    } // end-if
  }).catch(error => {
    console.log('ROLE CREATION ERROR');
    console.log(error)
  });

}

/**
 * create Admin role with permissions
 * @param {object} strapi - The strapi object.
 */
function createAdminRole(strapi) {
  const basic_perms = ['find', 'findOne', 'create', 'update', 'delete']
  const basic_perms_localization = [...basic_perms, 'createLocalization']
  const basic_perms_no_delete_no_update = ['find', 'findOne', 'create']
  const basic_perms_no_delete = ['find', 'findOne', 'create', 'update']
  const admin_permissions = {
    'api::account-accounting-bexio.account-accounting-bexio': basic_perms,
    'api::account-bexio.account-bexio': basic_perms,
    'api::action.action': basic_perms,
    'api::action-normalized-type.action-normalized-type': basic_perms,
    'api::activity-bexio.activity-bexio': basic_perms,
    'api::activity-log.activity-log': basic_perms,
    'api::article.article': basic_perms,
    'api::bexio-package.bexio-package': basic_perms,
    'api::bill.bill': basic_perms,
    'api::book.book': basic_perms_localization,
    'api::category.category': basic_perms_localization,
    'api::channel.channel': basic_perms,
    'api::chapter.chapter': basic_perms_localization,
    'api::client-bexio.client-bexio': [...basic_perms, 'startSetup'],
    'api::composition.composition': [...basic_perms, 'createComposition', 'createLetter', 'createQRCode', 'createReference', 'genericAIRequest', 'pushToChannel', 'regenerateComposition', 'duplicate'],
    'api::composition-item.composition-item': basic_perms,
    'api::composition-prompt.composition-prompt': basic_perms,
    'api::composition-template.composition-template': basic_perms,
    'api::composition-template-group.composition-template-group': basic_perms,
    'api::consent.consent': [...basic_perms_localization, 'getCRMVersion'],
    'api::contact.contact': [...basic_perms_localization, 'anonymizeUserData', 'exportUserData', 'findAll', 'importCSV', 'safeCreate', 'duplicate'],
    'api::contact-bexio.contact-bexio': basic_perms,
    'api::contact-extra-field.contact-extra-field': basic_perms,
    'api::contact-interest.contact-interest': basic_perms,
    'api::contact-title.contact-title': basic_perms,
    'api::contact-salutation.contact-salutation': basic_perms,
    'api::contact-relationship.contact-relationship': basic_perms,
    'api::contact-type.contact-type': basic_perms,
    'api::course.course': basic_perms,
    'api::currency.currency': basic_perms,
    'api::department.department': basic_perms,
    'api::job-title.job-title': basic_perms,
    'api::document.document': [...basic_perms, 'createLNCertificate', 'createLNNavigator'],
    'api::donation-subscription.donation-subscription': basic_perms,
    'api::donation-transaction.donation-transaction': basic_perms,
    'api::email.email': basic_perms,
    'api::email-log.email-log': basic_perms,
    'api::email-template.email-template': basic_perms,
    'api::embeddable-report.embeddable-report': basic_perms,
    'api::event.event': [...basic_perms, 'getCompositionChannelData', 'trackEvent', 'getEventChartData'],
    'api::expense.expense': basic_perms,
    'api::tag.tag': basic_perms,
    'api::form.form': [...basic_perms, 'formSubmit', 'duplicate'],
    'api::form-item.form-item': basic_perms,
    'api::frequency.frequency': basic_perms,
    'api::identity.identity': basic_perms,
    'api::industry.industry': basic_perms,
    'api::invoice.invoice': basic_perms,
    'api::job.job': basic_perms,
    'api::journey.journey': [...basic_perms, 'duplicate'],
    'api::journey-passed-step.journey-passed-step': basic_perms,
    'api::journey-step.journey-step': basic_perms,
    'api::journey-step-rule.journey-step-rule': basic_perms,
    'api::journey-step-rule-score.journey-step-rule-score': basic_perms,
    'api::journey-step-connection.journey-step-connection': basic_perms,
    'api::keyword.keyword': basic_perms,
    'api::list.list': [...basic_perms, "activeContactsCount", "duplicate"],
    'api::manual-entry.manual-entry': basic_perms,
    'api::media-type.media-type': basic_perms,
    'api::note.note': basic_perms,
    'api::notification.notification': basic_perms,
    'api::now-wiki-package.now-wiki-package': basic_perms,
    'api::now-wiki-user-subscription.now-wiki-user-subscription': basic_perms,
    'api::order.order': basic_perms,
    'api::organization.organization': [...basic_perms, 'duplicate'],
    'api::organization-type.organization-type': basic_perms,
    'api::product.product': basic_perms,
    'api::project.project': basic_perms,
    'api::publication.publication': basic_perms,
    'api::quote.quote': basic_perms,
    'api::scheduled-composition.scheduled-composition': basic_perms,
    'api::rank.rank': basic_perms,
    'api::report.report': basic_perms,
    'api::rule.rule': basic_perms,
    'api::score-item.score-item': [...basic_perms, 'getScoreAgregations'],
    'api::score-range.score-range': basic_perms,
    'api::search-history.search-history': basic_perms,
    'api::search-history-template.search-history-template': basic_perms,
    'api::setting.setting': basic_perms,
    'api::setting.setting': basic_perms,
    'api::setting-credential.setting-credential': basic_perms,
    'api::source.source': basic_perms,
    'api::submision.submision': basic_perms,
    'api::subscription.subscription': [...basic_perms, 'unsubscribe', 'createContact'],
    'api::subscription-type.subscription-type': basic_perms,
    'api::survey.survey': basic_perms,
    'api::survey-item.survey-item': basic_perms,
    'api::task.task': basic_perms,
    'api::tax.tax': basic_perms,
    'api::unipile-identity.unipile-identity': basic_perms,
    'api::text-block.text-block': basic_perms_localization,
    'api::timesheet.timesheet': basic_perms,
    'api::user-bexio.user-bexio': basic_perms,
    'api::vat-period.vat-period': basic_perms,
    'plugin::i18n.locales': ['listLocales'],
    'plugin::fuzzy-search.searchcontroller': ['search'],
    'plugin::upload.content-api': ['find', 'findOne', 'upload', 'destroy'],
    'plugin::users-permissions.auth': ['connect', 'forgotPassword', 'emailConfirmation', 'sendEmailConfirmation', 'resetPassword', 'changePassword', 'callback'],
    'plugin::users-permissions.permissions': ['getPermissions'],
    'plugin::users-permissions.role': ['createRole', 'deleteRole', 'find', 'findOne', 'updateRole'],
    'plugin::users-permissions.user': ['count', 'create', 'destroy', 'find', 'findOne', 'me', 'update']
  };


  strapi.db.query('plugin::users-permissions.role').findOne({ where: { name: 'Admin' } }).then(response => {
    if (!response) {
      strapi.db.query('plugin::users-permissions.role').create({
        data: {
          name: 'Admin',
          type: 'admin',
          description: 'Has access to everything',
        }
      }).then(role_response => {
        console.log('ADMIN ROLE CREATED')
        assignRolePermissions(strapi, role_response.id, admin_permissions);
      }) //end-then-role
    } // end-if
    else {
      assignRolePermissions(strapi, response.id, admin_permissions);
    }
  }).catch(error => {
    console.log('ROLE CREATION ERROR');
    console.log(error)
  });

}
/**
 * function which cleanups permessions so they dont take a lot of disk space
 */
async function cleanupPermissions(strapi) {
  //cleanup permissions before creating new
  strapi.db.query('plugin::users-permissions.permission').deleteMany(
    { where: { action: { $contains: '::' } } }
  ).then(res =>
    console.log(`cleaned permissions ${res}`)
  )
}

/**
 * Assign permissions to role
 * @param {object} strapi
 * @param {number} role_id
 * @param {object} permissions
 */
function assignRolePermissions(strapi, role_id, permissions) {
  // const roleId = role_response.id;
  const entries = Object.entries(permissions);
  const lastKey = entries[entries.length - 1][0];
  const permission_ids = [];
  for (const [key, value] of entries) {
    for (const permission of value) {
      const permission_name = `${key}.${permission}`

      strapi.db.query('plugin::users-permissions.permission').create({
        data: {
          action: permission_name
        }
      }).then(permission_response => {
        permission_ids.push(permission_response.id)
        if (key === lastKey) {
          strapi.db.query('plugin::users-permissions.role').update({
            where: {
              id: role_id
            },
            data: {
              permissions: permission_ids
            }
          }).then(update_response => {
            console.log('UPDATED')
            console.log(update_response)
          });
        }
      });
    } // end-for
  } // end-for
}

/**
 * Ensures necessary locales and consents are created if they do not exist.
 * @param {object} strapi - The strapi object.
 */
async function ensureLocalesAndConsents(strapi) {
  const localesToEnsure = ['en', 'de', 'it', 'fr'];
  // Step 1: Ensure all locales exist
  const existingLocales = await strapi.plugin('i18n').service('locales').find();
  const missingLocales = localesToEnsure.filter(locale => !existingLocales.some(existingLocale => existingLocale.code === locale));

  for (const locale of missingLocales) {
    try {
      await strapi.plugin('i18n').service('locales').create({
        code: locale,
        name: locale,
      });
    } catch (error) {
      console.error(`Error creating locale '${locale}':`, error);
    }
  }

  // Step 2: Load markdown and prepare consent data
  // Change version in consents obj. for a new consent to be uploaded
  const publishedAt = new Date().getTime();
  const consents = {
    en: {
      version: "1",
      title: "Privacy Policy",
      text: "",
      locale: "en",
      active: true,
      publishedAt: publishedAt
    },
    de: {
      version: "1",
      title: "Datenschutzerklärung",
      text: "",
      locale: "de",
      active: true,
      publishedAt: publishedAt
    },
    fr: {
      version: "1",
      title: "Politique de confidentialité",
      text: "",
      locale: "fr",
      active: true,
      publishedAt: publishedAt
    },
    it: {
      version: "1",
      title: "Informativa sulla privacy",
      text: "",
      locale: "it",
      active: true,
      publishedAt: publishedAt
    }
  };
  const targetVersion = consents.en.version;

  // Step 3: Check if target version consent exists for ALL locales
  const missingConsents = [];

  for (const locale of localesToEnsure) {
    const existing = await strapi.entityService.findMany('api::consent.consent', {
      filters: { version: targetVersion },
      locale,
    });

    if (!existing || existing.length === 0) {
      missingConsents.push(locale);
    }
  }

  if (missingConsents.length === 0) {
    console.log('All locales already have version 1 consent. Skipping creation.');
    return;
  }

  // Step 4: Create entries only for missing locales
  for (const locale of missingConsents) {
    try {
      const text = require('fs').readFileSync(__dirname + `/consent_${locale}.md`, 'utf8');
      const data = {
        ...consents[locale],
        text,
      };

      await strapi.entityService.create('api::consent.consent', { data });

      console.log(`Created consent for locale '${locale}'`);
    } catch (error) {
      console.error(`Error creating consent for locale '${locale}':`, error);
    }
  }

  return true;
}

async function populateStartupEntry(strapi, api, data) {
  try {
    const items = await strapi.db.query(api).findMany();
    if (Array.isArray(data) && items.length > 0) {
      const existingIds = items.map(item => item.id);
      return existingIds; // Return IDs of existing entries
    }

    if (Array.isArray(data) && items.length === 0) {
      const ids = await Promise.all(
        data.map(async (item) => {
          try {
            const res = await strapi.entityService.create(api, { data: item });
            return res.id;
          } catch (err) {
            console.error(`Error creating ${api} entry:`, err.message);
            console.error('Data that failed:', JSON.stringify(item, null, 2));
            throw err;
          }
        })
      );
      return ids;
    }

    return [];
  } catch (err) {
    console.error(`Error in populateStartupEntry for ${api}:`, err);
    throw err;
  }
}

async function populateStartupEntryWithAdjustments(strapi, api, data) {
  const items = await strapi.db.query(api).findMany();

  // Check if items already exist
  if (Array.isArray(data) && items.length > 0) {
    const existingIds = items.map(item => item.id);

    // If existing items are less than the data length, add only missing items
    if (items.length < data.length) {
      const existingData = items.map(item => item.name); // Adjust this line based on unique identifier in your data
      const newItems = data.filter(item => !existingData.includes(item.name));

      const newIds = await Promise.all(
        newItems.map(async (item) => {
          const res = await strapi.entityService.create(api, { data: item });
          return res.id;
        })
      );

      return [...existingIds, ...newIds]; // Return all IDs (existing + newly created)
    }

    return existingIds; // Return only existing IDs if no new items need to be added
  }

  // If no items exist, add all items from data
  if (Array.isArray(data) && items.length === 0) {
    const ids = await Promise.all(
      data.map(async (item) => {
        const res = await strapi.entityService.create(api, { data: item });
        console.log(res);
        return res.id;
      })
    );
    return ids;
  }

  return [];
}

/**
 * Create SuperAdmin user with specified credentials if not exists.
 * @param {object} strapi - The strapi object.
 * @param {string} email - The email for the superadmin user.
 * @param {string} password - The password for the superadmin user.
 */
async function createSuperAdminUserIfNotExist(strapi, email, password) {
  if (!process.env.NT_ACTIVE_SERVICES.includes('nowbi')) {
    console.log('Service does not contain now-bi. Exiting function.');
    return;
  }

  let superAdminRole;
  try {
    superAdminRole = await strapi.db.query('admin::role').findOne({
      where: { code: 'strapi-super-admin' }
    });
    if (!superAdminRole) {
      throw new Error('SuperAdmin role not found');
    }
  } catch (error) {
    console.error('Error fetching SuperAdmin role:', error.message);
    throw error;
  }

  try {
    const superAdminExists = await strapi.query('admin::user').count({
      where: { roles: { id: superAdminRole.id } }
    });

    if (superAdminExists === 0) {
      const createdUser = await strapi.admin.services.user.create({
        email: email || 'techadmin@nowtec.solutions',
        password: password,
        firstname: 'Super',
        lastname: 'Admin',
        roles: [superAdminRole.id],
        isActive: true,
      });

      console.info('SuperAdmin user created successfully');
      console.info('credentials for new strapi account is', email || 'techadmin@nowtec.solutions', password)
      try {
        const company_email = process.env.STRAPI_ORGANIZATON_EMAIL_STRAPI;
        const response = await fetch(process.env.STRAPI_N8N_UPDATE_STRAPI_DATA_WEBHOOK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ company_email: company_email, strapi_user: email, strapi_password: password })
        });

        if (!response.ok) {
          throw new Error(`Failed to update SuperAdmin user data via webhook. Status: ${response.status}`);
        }

        console.log('SuperAdmin user data updated successfully via webhook');
      } catch (error) {
        console.error('Error updating SuperAdmin user data via webhook:', error.message);
      }
    } else {
      console.log('A SuperAdmin user already exists');
    }
  } catch (error) {
    console.error('Error creating SuperAdmin user:', error.message);
    throw error;
  }
}

async function createSuperAdminTest(strapi, email, password) {
  if (!process.env.TEST_RUN || process.env.TEST_RUN === false) {
    console.log('TEST_RUN ENV is false exiting function')
    return;
  }
  let superAdminRole;

  try {
    superAdminRole = await strapi.db.query('admin::role').findOne({
      where: { code: 'strapi-super-admin' }
    });
    console.log('debug admin role')
    console.log(superAdminRole)
    if (!superAdminRole) {
      throw new Error('SuperAdmin role not found');
    }
  } catch (error) {
    console.error(`Error fetching SuperAdmin role: ${error.message}`);
    throw error;
  }

  try {
    const superAdminExists = await strapi.query('admin::user').count({
      where: { roles: { id: superAdminRole.id } }
    });
    console.log('debug super admin exist')
    console.log(superAdminExists)
    if (superAdminExists === 0) {
      await strapi.admin.services.user.create({
        email: email || process.env.STRAPI_TEST_ADMIN_EMAIL,
        password: password || process.env.STRAPI_TEST_ADMIN_PASSWORD,
        firstname: 'Super',
        lastname: 'Admin',
        roles: [superAdminRole.id],
        isActive: true,
      });

      console.log('SuperAdmin user created successfully');
      console.log(`STRAPI_TEST_EMAIL=${email}`)
      console.log(`STRAPI_TEST_PASSWORD=${password}`)
    } else {
      console.log('A SuperAdmin user already exists');
    }
  } catch (error) {
    console.error('Error creating SuperAdmin user:', error.message);
    throw error;
  }
}

async function createApiTokenTest(strapi) {
  if (!process.env.TEST_RUN || process.env.TEST_RUN === false) {
    console.log('TEST_RUN ENV is false exiting function')
    return;
  }
  try {
    const tokenService = strapi.service('admin::api-token');

    if (tokenService && tokenService.create) {
      const tokenAlreadyExists = await tokenService.exists({
        name: 'test-admin',
      });
      console.log('debug token already exist')
      console.log(tokenAlreadyExists)
      if (tokenAlreadyExists) {
        console.info(`An API token named 'test-admin' already exists, skipping...`);
      } else {
        console.info(`Creating 'test-admin' API token`);
        const { accessKey: apiKey } = await tokenService.create({
          name: 'test-admin',
          type: 'custom',
          lifespan: null,
          permissions: [
            // Add specific permissions for Users & Permissions plugin
            // Examples of permissions you might want to add:
            'api::contact.contact.findOne',
            'api::contact.contact.find',
            'api::contact.contact.create',
            'api::contact.contact.update',
            'api::contact.contact.delete',
            'plugin::users-permissions.auth.callback',
            'plugin::users-permissions.auth.changePassword',
            'plugin::users-permissions.auth.resetPassword',
            'plugin::users-permissions.auth.connect',
            'plugin::users-permissions.auth.forgotPassword',
            'plugin::users-permissions.auth.register',
            'plugin::users-permissions.auth.emailConfirmation',
            'plugin::users-permissions.auth.sendEmailConfirmation',

            'plugin::users-permissions.user.create',
            'plugin::users-permissions.user.update',
            'plugin::users-permissions.user.find',
            'plugin::users-permissions.user.findOne',
            'plugin::users-permissions.user.count',
            'plugin::users-permissions.user.destroy',
            'plugin::users-permissions.user.me',

            'plugin::users-permissions.role.createRole',
            'plugin::users-permissions.role.findOne',
            'plugin::users-permissions.role.find',
            'plugin::users-permissions.role.updateRole',
            'plugin::users-permissions.role.deleteRole',

            'plugin::users-permissions.permissions.getPermissions',
            'api::form.form.duplicate',
            'api::form.form.formSubmit',

            'api::form.form.find',
            'api::form.form.findOne',
            'api::form.form.create',
            'api::form.form.update',
            'api::form.form.delete',

            'api::form-item.form-item.find',
            'api::form-item.form-item.findOne',
            'api::form-item.form-item.create',
            'api::form-item.form-item.update',
            'api::form-item.form-item.delete',

            'api::media-type.media-type.find',
            'api::media-type.media-type.findOne',
            'api::media-type.media-type.create',
            'api::media-type.media-type.update',
            'api::media-type.media-type.delete',
            'api::composition.composition.createReference',
            'api::composition.composition.duplicate',
            'api::composition.composition.create',
            'api::composition.composition.findOne',
            'api::composition.composition.find',
            'api::composition.composition.delete',
            'api::composition.composition.update',
            'api::contact.contact.duplicate',
            'api::contact.contact.exportUserData',
            'api::contact.contact.anonymizeUserData',
            'api::contact.contact.bulkCreate',
            'api::contact.contact.bulkUpdate',
            'api::contact.contact.bulkDelete',
            'api::contact.contact.createLocalization',
            'api::contact-extra-field.contact-extra-field.find',
            'api::contact-extra-field.contact-extra-field.findOne',
            'api::contact-extra-field.contact-extra-field.create',
            'api::contact-extra-field.contact-extra-field.update',
            'api::contact-extra-field.contact-extra-field.delete',
            'api::contact-interest.contact-interest.find',
            'api::contact-interest.contact-interest.findOne',
            'api::contact-interest.contact-interest.create',
            'api::contact-interest.contact-interest.update',
            'api::contact-interest.contact-interest.delete',
            'api::contact-type.contact-type.find',
            'api::contact-type.contact-type.findOne',
            'api::contact-type.contact-type.create',
            'api::contact-type.contact-type.update',
            'api::contact-type.contact-type.delete',
            'api::department.department.find',
            'api::department.department.findOne',
            'api::department.department.create',
            'api::department.department.update',
            'api::department.department.delete',
            'api::job-title.job-title.find',
            'api::job-title.job-title.findOne',
            'api::job-title.job-title.create',
            'api::job-title.job-title.update',
            'api::job-title.job-title.delete',
            'api::frequency.frequency.find',
            'api::frequency.frequency.findOne',
            'api::frequency.frequency.create',
            'api::frequency.frequency.update',
            'api::frequency.frequency.delete',
            'api::keyword.keyword.find',
            'api::keyword.keyword.findOne',
            'api::keyword.keyword.create',
            'api::keyword.keyword.update',
            'api::keyword.keyword.delete',
            'api::list.list.activeContactsCount',
            'api::list.list.duplicate',
            'api::list.list.find',
            'api::list.list.findOne',
            'api::list.list.create',
            'api::list.list.update',
            'api::list.list.delete',
            'api::note.note.find',
            'api::note.note.findOne',
            'api::note.note.create',
            'api::note.note.update',
            'api::note.note.delete',
            'api::organization.organization.duplicate',
            'api::organization.organization.find',
            'api::organization.organization.findOne',
            'api::organization.organization.create',
            'api::organization.organization.update',
            'api::organization.organization.delete',
            'api::organization-type.organization-type.find',
            'api::organization-type.organization-type.findOne',
            'api::organization-type.organization-type.create',
            'api::organization-type.organization-type.update',
            'api::organization-type.organization-type.delete',
            'api::rank.rank.find',
            'api::rank.rank.findOne',
            'api::rank.rank.create',
            'api::rank.rank.update',
            'api::rank.rank.delete',
            'api::source.source.find',
            'api::source.source.findOne',
            'api::source.source.create',
            'api::source.source.update',
            'api::source.source.delete',
            'api::subscription.subscription.find',
            'api::subscription.subscription.findOne',
            'api::subscription.subscription.create',
            'api::subscription.subscription.update',
            'api::subscription.subscription.delete',
            'api::subscription-type.subscription-type.find',
            'api::subscription-type.subscription-type.findOne',
            'api::subscription-type.subscription-type.create',
            'api::subscription-type.subscription-type.update',
            'api::subscription-type.subscription-type.delete'
          ],
        });
        console.info('for test')

        console.info(`CRM_STRAPI_API_TOKEN='${apiKey}'`)
      }
    }
    if (tokenService && tokenService.create) {
      const tokenAlreadyExists = await tokenService.exists({
        name: 'test-admin-composer',
      });
      console.log('debug token composer already exist')
      if (tokenAlreadyExists) {
        console.info(`An API token named 'test-admin-composer' already exists, skipping...`);
      } else {
        console.info(`Creating 'test-admin' API token`);
        const { accessKey: apiKey } = await tokenService.create({
          name: 'test-admin-composer',
          type: 'full-access',
          lifespan: null,
        });
        console.info('for test composer')
        console.info(`COMPOSER_STRAPI_API_TOKEN='${apiKey}'`)
      }
    }
    return
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
  }
}

async function applyFeatureFlags(strapi) {
  // Define a mapping of feature flags to content types to hide/display
  //Used for contents to exclude
  const featureFlagMappings = {
    NEXT_PUBLIC_FEATURE_FOR_MEMBERSPACE: [
      'api::account-accounting-bexio.account-accounting-bexio',
      'api::account-bexio.account-bexio',
      'api::activity-bexio.activity-bexio',
      'api::contact-bexio.contact-bexio',
      'api::article.article.article.article',
      'api::bill.bill',
      'api::book.book',
      'api::category.category',
      'api::article.article',
      'api::bexio-package.bexio-package',
      'api::composition-new.composition-new',
      'api::composition-prompt.composition-prompt',
      'api::channel.channel',
      'api::chapter.chapter',
      'api::client-bexio.client-bexio',
      'api::composition.composition',
      'api::composition-new.composition-new',
      'api::composition-template.composition-template',
      'api::composition-template-group.composition-template-group',
      'api::consent.consent',
      'api::currency.currency',
      'api::document.document',
      'api::donation-subscription.donation-subscription',
      'api::donation-transaction.donation-transaction',
      'api::embeddable-report.embeddable-report',
      'api::event.event',
      'api::expense.expense',
      'api::form.form',
      'api::form-item.form-item',
      'api::frequency.frequency',
      'api::identity.identity',
      'api::invoice.invoice',
      'api::job.job',
      'api::journey.journey',
      'api::journey-passed-step.journey-passed-step',
      'api::journey-step.journey-step',
      'api::keyword.keyword',
      'api::list.list',
      'api::manual-entry.manual-entry',
      'api::media-type.media-type',
      'api::now-wiki-package.now-wiki-package',
      'api::now-wiki-user-subscription.now-wiki-user-subscription',
      'api::order.order',
      'api::product.product',
      'api::project.project',
      'api::publication.publication',
      'api::quote.quote',
      'api::rank.rank',
      'api::report.report',
      'api::score-item.score-item',
      'api::score-range.score-range',
      'api::search-history.search-history',
      'api::setting.setting',
      'api::source.source',
      'api::subscription.subscription',
      'api::subscription-type.subscription-type',
      'api::survey.survey',
      'api::survey-item.survey-item',
      'api::task.task',
      'api::text-block.text-block',
      'api::timesheet.timesheet',
      'api::user-bexio.user-bexio',
      'api::vat-period.vat-period',
      'api::tax.tax',
      'api::video-ask-option.video-ask-option',
      'api::search-history-template.search-history-template',
      'api::industry.industry',
      'api::note.note',
      'api::notification.notification',

    ],
    NEXT_PUBLIC_FEATURE_EXCLUDE_BEXIO: [
      'api::user-bexio.user-bexio',
      'api::vat-period.vat-period',
      'api::account-accounting-bexio.account-accounting-bexio',
      'api::account-bexio.account-bexio',
      'api::activity-bexio.activity-bexio',
    ],
  };

  // Initialize an object to track whether a content type should be hidden
  const contentVisibility = {};

  // Iterate over each feature flag and its corresponding content types
  for (const [featureFlag, contentTypes] of Object.entries(featureFlagMappings)) {
    const isFeatureEnabled = process.env[featureFlag] === "true";
    console.log(featureFlag, isFeatureEnabled);

    // Update visibility status for each content type in the current feature flag
    contentTypes.forEach((contentType) => {
      if (!contentVisibility.hasOwnProperty(contentType)) {
        // Initialize visibility to true (shown) by default
        contentVisibility[contentType] = true;
      }

      // If the feature is enabled, mark the content type as hidden
      if (isFeatureEnabled) {
        contentVisibility[contentType] = false;
      }
    });
  }

  // Apply the visibility settings to the content types in Strapi
  Object.entries(contentVisibility).forEach(([contentType, isVisible]) => {
    const schema = strapi.contentTypes[contentType];
    if (schema) {
      // Ensure pluginOptions and content-manager visibility setting exist
      if (!schema.pluginOptions) {
        schema.pluginOptions = {};
      }
      if (!schema.pluginOptions['content-manager']) {
        schema.pluginOptions['content-manager'] = {};
      }
      // Set visibility based on the aggregated feature flags
      schema.pluginOptions['content-manager'].visible = isVisible;
    }
  });


}

async function seedJobTitles(strapi) {
  const jobTitlesCount = await strapi.query('api::job-title.job-title').count();
  if (jobTitlesCount === 0) {
    await strapi.query('api::job-title.job-title').createMany({
      data: [
        {
          name: 'Administrative',
          publishedAt: new Date().toISOString(),
        },
        {
          name: 'Consulting',
          publishedAt: new Date().toISOString(),
        },
        {
          name: 'Customer Service',
          publishedAt: new Date().toISOString(),
        },
        {
          name: 'Education',
          publishedAt: new Date().toISOString(),
        },
        {
          name: 'Engineering',
          publishedAt: new Date().toISOString(),
        },
        {
          name: 'Finance',
          publishedAt: new Date().toISOString(),
        },
        {
          name: 'Healthcare',
          publishedAt: new Date().toISOString(),
        },
        {
          name: 'Human Resources',
          publishedAt: new Date().toISOString(),
        },
        {
          name: 'Information Technology',
          publishedAt: new Date().toISOString(),
        },
        {
          name: 'Legal',
          publishedAt: new Date().toISOString(),
        },
        {
          name: 'Management',
          publishedAt: new Date().toISOString(),
        },
        {
          name: 'Marketing',
          publishedAt: new Date().toISOString(),
        },
        {
          name: 'Operations',
          publishedAt: new Date().toISOString(),
        },
        {
          name: 'Research',
          publishedAt: new Date().toISOString(),
        },
        {
          name: 'Sales',
          publishedAt: new Date().toISOString(),
        },
      ],
    });
    console.log('Job titles have been seeded');
  }
}

async function seedCommonEntities(strapi) {
  // Seed job titles (for all installations)
  await seedJobTitles(strapi);

  // Seed campaign categories (for all installations)
  const campaignCategoriesCount = await strapi.query('api::campaign-category.campaign-category').count();
  if (campaignCategoriesCount === 0) {
    await strapi.query('api::campaign-category.campaign-category').createMany({
      data: [
        {
          name: 'Fundraising',
          description: 'Campaigns focused on raising funds for various causes',
          publishedAt: new Date().toISOString(),
        },
        {
          name: 'Awareness',
          description: 'Campaigns to raise awareness about specific issues',
          publishedAt: new Date().toISOString(),
        },
        {
          name: 'Engagement',
          description: 'Campaigns to engage with supporters and build community',
          publishedAt: new Date().toISOString(),
        },
      ],
    });
    console.log('Campaign categories have been seeded');
  }

  // Seed campaigns (for all installations)
  const campaignsCount = await strapi.query('api::campaign.campaign').count();
  if (campaignsCount === 0) {
    const categories = await strapi.query('api::campaign-category.campaign-category').findMany();
    if (categories.length > 0) {
      // Find specific categories
      const fundraisingCategory = categories.find(c => c.name === 'Fundraising');
      const awarenessCategory = categories.find(c => c.name === 'Awareness');
      const engagementCategory = categories.find(c => c.name === 'Engagement');

      // Create meaningful campaigns
      const campaigns = [
        {
          name: 'Climate Action Initiative',
          description: 'Join us in our mission to combat climate change through education, advocacy, and direct action. Help us reach our goal to plant 10,000 trees and reduce carbon emissions.',
          campaign_category: awarenessCategory?.id || categories[0].id,
        },
        {
          name: 'Annual Donation Drive',
          description: 'Support our community programs with your generous donations. Every contribution helps us provide essential services to those in need.',
          campaign_category: fundraisingCategory?.id || categories[0].id,
        },
        {
          name: 'Volunteer Recruitment Campaign',
          description: 'We are looking for passionate volunteers to join our team! Whether you have a few hours a week or can commit to regular involvement, we need you.',
          campaign_category: engagementCategory?.id || categories[0].id,
        },
        {
          name: 'Community Health Awareness',
          description: 'Promoting healthy living and preventive care in our community. Join our workshops, health screenings, and wellness programs.',
          campaign_category: awarenessCategory?.id || categories[0].id,
        },
        {
          name: 'Education Scholarship Fund',
          description: 'Help us provide educational opportunities to underprivileged youth. Your donations fund scholarships, books, and learning materials.',
          campaign_category: fundraisingCategory?.id || categories[0].id,
        },
      ];

      // Create campaigns one by one
      for (const campaign of campaigns) {
        await strapi.entityService.create('api::campaign.campaign', {
          data: {
            ...campaign,
            publishedAt: new Date().toISOString(),
          }
        });
      }
      console.log('Campaigns have been seeded');
    }
  }
}

async function seedEntities(strapi) {

  const { faker } = require('@faker-js/faker'); // Import from the new package

  // Seed users
  const isForMemberSpace = process.env.STRAPI_NEXT_PUBLIC_FEATURE_FOR_MEMBERSPACE === "true";
  if (!isForMemberSpace) return;


  // Arrays used for seeding
  const genderArray = ['female', 'male'];
  const languageArray = ['en', 'de', 'fr', 'it'];
  const statusArray = ['New', 'For Review'];

  // Seed users
  const usersCount = await strapi.query('plugin::users-permissions.user').count();
  if (usersCount === 0) {
    await strapi.query('plugin::users-permissions.user').createMany({
      data: Array.from({ length: 1 }).map(() => ({
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        confirmed: true,
        blocked: false,
        first_name: faker.person.firstName(),  // Use faker.person instead of faker.name
        last_name: faker.person.lastName(),    // Use faker.person instead of faker.name
        is_active: faker.datatype.boolean(),
        gender: faker.helpers.arrayElement(genderArray),  // Ensure the array is not empty
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        postal_code: faker.location.zipCode(),
        subscribed: faker.datatype.boolean(),
        language_code: faker.helpers.arrayElement(languageArray),  // Ensure the array is not empty
      })),
    });
    console.log('Users have been seeded');
  }

  // Seed submissions
  const submissionsCount = await strapi.query('api::submision.submision').count();
  if (submissionsCount === 1) {
    await strapi.query('api::submision.submision').createMany({
      data: Array.from({ length: 3 }).map(() => ({
        status: faker.helpers.arrayElement(statusArray),  // Ensure the array is not empty
        name: `Submission by ${faker.person.firstName()}`,  // Use faker.person.firstName
        user: faker.number.int({ min: 1, max: 5 }),  // Use faker.number.int instead of faker.datatype.number
        hours_required: faker.number.int({ min: 1, max: 20 }),  // Use faker.number.int instead of faker.datatype.number
        remarks: faker.lorem.sentence(),
        is_processed: faker.datatype.boolean(),
      })),
    });
    console.log('Submissions have been seeded');
  }

  // Seed courses
  const coursesCount = await strapi.query('api::course.course').count();
  if (coursesCount === 1) {
    await strapi.query('api::course.course').createMany({
      data: Array.from({ length: 3 }).map(() => ({
        title: faker.lorem.words(3),
        date_from: faker.date.past(1),
        date_until: faker.date.future(1),
        hours_reported: faker.number.int({ min: 5, max: 15 }),  // Use faker.number.int instead of faker.datatype.number
        course_leader: faker.person.fullName(),  // Use faker.person.fullName instead of faker.name.findName
        organizer: faker.company.name(),  // Use faker.company.name instead of faker.company.companyName
        submission: faker.number.int({ min: 1, max: 3 }),  // Use faker.number.int instead of faker.datatype.number
        hours_accepted: faker.number.int({ min: 0, max: 15 }),  // Use faker.number.int instead of faker.datatype.number
        carry_forward: faker.number.int({ min: 0, max: 5 }),  // Use faker.number.int instead of faker.datatype.number
        is_processed: faker.datatype.boolean(),
      })),
    });
    console.log('Courses have been seeded');
  }

  // Seed files (if necessary)
  const filesCount = await strapi.query('plugin::upload.file').count();
  if (filesCount === 1) {
    await strapi.query('plugin::upload.file').createMany({
      data: Array.from({ length: 2 }).map(() => ({
        name: faker.system.fileName(),
        url: `/uploads/${faker.system.fileName()}`,
        type: faker.system.mimeType(),
        title: faker.lorem.words(2),
      })),
    });
    console.log('Files have been seeded');
  }
}

async function seedLinkedEntitiesForTempUsers(strapi) {
  const { faker } = require('@faker-js/faker');

  const TEMP_EMAILS = [
    'temporary1@email.com',
    'temporary2@email.com',
    'temporary3@email.com',
    'temporary4@email.com',
    'temporary5@email.com',
  ];

  // Step 1: Load temporary contacts
  const contacts = await strapi.db.query('api::contact.contact').findMany({
    where: { email: { $in: TEMP_EMAILS } },
  });

  if (!contacts.length) {
    console.warn('No temporary contacts found. Skipping.');
    return;
  }

  const [normalizedTypes, channels] = await Promise.all([
    strapi.entityService.findMany('api::action-normalized-type.action-normalized-type'),
    strapi.entityService.findMany('api::channel.channel'),
  ]);

  if (!normalizedTypes.length || channels.length < 3) {
    console.warn('Missing action types or not enough channels.');
    return;
  }

  const normalizedTypeMap = Object.fromEntries(normalizedTypes.map(n => [n.name, n.id]));

  // Step 2: Create Composition and Items
  const composition = await strapi.entityService.create('api::composition.composition', {
    data: {
      name: 'Seeded Test Composition',
      category: 'Newsletter',
      language: 'en',
      persona: 'NGO Outreach Lead',
      reference_prompt: 'Generate a personalized message for environmental supporters.',
      reference_result: 'Dear Supporter, your action matters for the planet...',
      status: 'New',
      add_unsubscribe: true,
      model: 'claude',
      publishedAt: new Date().toISOString(),
    }
  });

  const usedChannels = channels.slice(0, 3);
  for (const ch of usedChannels) {
    await strapi.entityService.create('api::composition-item.composition-item', {
      data: {
        additional_prompt: faker.lorem.sentence(),
        result: faker.lorem.paragraph(),
        publication_date: faker.date.past({ years: 1 }),
        status: 'Published',
        channel: ch.id,
        composition: composition.id,
        publishedAt: new Date().toISOString(),
      }
    });
  }

  const compositionItems = await strapi.entityService.findMany('api::composition-item.composition-item', {
    filters: { composition: composition.id },
    populate: ['channel'],
  });

  // Step 3: Create Form + Items with correct `name`
  const form = await strapi.entityService.create('api::form.form', {
    data: {
      name: 'Seeded Onboarding Form',
      description: 'Standard identity and preference form.',
      submit_confirm_text: 'Thank you!',
      submission_success_text: 'Thank you for taking part in this survey',
      slug: 'seeded-onboarding-form',
      submit_text: 'Submit',
      active: true,
      keep_contact: true,
      form_view: true,
      publishedAt: new Date().toISOString(),
    },
  });

  const FIELD_DEFS = [
    { type: 'text', label: 'First Name' },
    { type: 'email', label: 'Email' },
    { type: 'number', label: 'Phone Number' },
    { type: 'text_area', label: 'Short Bio' },
    { type: 'checkbox', label: 'Subscribe to Newsletter' },
    { type: 'multi_choice', label: 'Gender', options: ['Male', 'Female', 'Other'] },
    { type: 'multi_checkbox', label: 'Languages', options: ['English', 'French', 'German'] },
    { type: 'select', label: 'Country', options: ['CH', 'DE', 'FR'] },
    { type: 'date', label: 'Preferred Contact Date' },
  ];

  const formItems = [];
  for (let i = 0; i < FIELD_DEFS.length; i++) {
    const def = FIELD_DEFS[i];
    const name = def.label
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w_]/g, "");

    const item = await strapi.entityService.create('api::form-item.form-item', {
      data: {
        name,
        label: def.label,
        type: def.type,
        options: def.options || null,
        form: form.id,
        required: faker.datatype.boolean(),
        rank: i + 1,
        publishedAt: new Date().toISOString(),
      },
    });
    formItems.push(item);
  }

  const actionTypeMap = {
    email_click: 'Engagement',
    signup: 'Acquisition',
    donation: 'Conversion',
    survey_submit: 'Feedback',
  };

  // Step 4: Seed Data per Contact
  for (const contact of contacts) {
    // Subscription
    await strapi.entityService.create('api::donation-subscription.donation-subscription', {
      data: {
        contact: contact.id,
        amount: faker.number.int({ min: 10, max: 500 }),
        currency: faker.helpers.arrayElement(['CHF', 'EUR', 'USD']),
        interval: faker.helpers.arrayElement(['monthly', 'quarterly', 'yearly']),
        payment_method: faker.helpers.arrayElement(['credit_card', 'paypal', 'twint']),
        payment_provider: faker.helpers.arrayElement(['Stripe', 'PayPal', 'Manual']),
        subscription_token: faker.string.alphanumeric(24),
        raw_data: JSON.stringify({
          note: faker.lorem.sentence(),
          platform: 'test-seed',
          created_by: faker.internet.email(),
        }),
        publishedAt: new Date().toISOString(),
      }
    });

    // Transaction
    await strapi.entityService.create('api::donation-transaction.donation-transaction', {
      data: {
        contact: contact.id,
        amount: faker.finance.amount(10, 500, 2),
        currency: faker.helpers.arrayElement(['CHF', 'EUR', 'USD']),
        payment_method: faker.helpers.arrayElement(['credit_card', 'paypal']),
        payment_provider: faker.helpers.arrayElement(['Stripe', 'PayPal']),
        status: faker.helpers.arrayElement(['completed', 'pending', 'failed']),
        card_holder_name: faker.person.fullName(),
        user_ip: faker.internet.ip(),
        user_agent: faker.internet.userAgent(),
        epp_transaction_id: `txn_${faker.string.alphanumeric(12)}`,
        raw_data: JSON.stringify({
          processor: 'faker',
          debug_id: faker.string.uuid(),
          time: new Date().toISOString()
        }),
        campaign_id: `cmp_${faker.string.alphanumeric(8)}`,
        campaign_name: faker.company.catchPhrase(),
        purpose: faker.helpers.arrayElement(['General Fund', 'Emergency Relief']),
        donation_date: faker.date.past({ years: 1 }).toISOString(),
        publishedAt: new Date().toISOString()
      }
    });

    // Action
    const actionType = faker.helpers.arrayElement(Object.keys(actionTypeMap));
    const normalizedTypeId = normalizedTypeMap[actionTypeMap[actionType]];
    await strapi.entityService.create('api::action.action', {
      data: {
        title: `Seeded ${actionType} for ${contact.first_name}`,
        description: `Test ${actionType} for ${contact.email}`,
        contact: contact.id,
        action_type: actionType,
        action_normalized_type: normalizedTypeId,
        entity: faker.helpers.arrayElement(['newsletter', 'petition', 'donation_form']),
        value: faker.string.alphanumeric(8),
        external_id: faker.string.uuid(),
        source: faker.helpers.arrayElement(['website', 'mobile_app']),
        effort: faker.helpers.arrayElement(['low', 'medium', 'high']),
        partnership: faker.company.name(),
        payload: {
          createdBy: faker.internet.email(),
          platform: 'faker',
          note: faker.lorem.sentence(),
        },
        status: faker.helpers.arrayElement(['completed', 'pending', 'in_review']),
        publishedAt: new Date().toISOString(),
      }
    });

    // Events
    for (let i = 0; i < 5; i++) {
      const randomItem = faker.helpers.arrayElement(compositionItems);

      await strapi.entityService.create('api::event.event', {
        data: {
          title: `Event ${i + 1} for ${contact.first_name}`,
          action: faker.helpers.arrayElement(['EMAIL_SENT', 'CLICK', 'OPEN']),
          payload: JSON.stringify({
            session: faker.string.uuid(),
            timestamp: new Date().toISOString(),
            detail: faker.lorem.sentence()
          }),
          source: faker.helpers.arrayElement(['email-service', 'crm-sync']),
          external_id: faker.string.uuid(),
          status: faker.helpers.arrayElement(['processed', 'pending']),
          destination: faker.internet.email(),
          pinpoint_campaign_id: `pin-${faker.string.alphanumeric(10)}`,
          step_id: `step-${faker.string.alphanumeric(6)}`,
          contact: contact.id,
          channel: randomItem.channel?.id,
          composition: composition.id,
          publishedAt: new Date().toISOString(),
        }
      });
    }

    // Survey + Survey Items
    const survey = await strapi.entityService.create('api::survey.survey', {
      data: {
        name: `Survey Response for ${contact.email}`,
        contact: contact.id,
        form_id: form.id.toString(),
        publishedAt: new Date().toISOString(),
      },
    });

    for (const item of formItems) {
      await strapi.entityService.create('api::survey-item.survey-item', {
        data: {
          question: item.label,
          answer: faker.lorem.words(3),
          survey: survey.id,
          contact: contact.id,
          publishedAt: new Date().toISOString(),
        },
      });
    }
  }
  // ✅ Step 5: Subscriptions
  const allChannels = await strapi.entityService.findMany('api::channel.channel');
  const allSubscriptionTypes = await strapi.entityService.findMany('api::subscription-type.subscription-type');

  if (!allChannels.length || !allSubscriptionTypes.length) {
    console.warn('⚠️ Cannot create subscriptions: missing channel or subscription type');
    return;
  }
  const defaultSubType = allSubscriptionTypes[0];

  // 5.1: Create 1 Subscription per Contact
  for (const [i, contact] of contacts.entries()) {
    const assignedChannel = allChannels[i % allChannels.length];

    await strapi.entityService.create('api::subscription.subscription', {
      data: {
        contact: contact.id,
        channel: assignedChannel,
        subscription_type: defaultSubType.id,
        subscribed_at: new Date().toISOString(),
        unsubscribe_token: faker.string.uuid(),
        active: true,
        period: faker.helpers.arrayElement([7, 14, 30, 90]),
        publishedAt: new Date().toISOString(),
      },
    });
  }

  // 5.2: Create 1 List with 2 Contacts
  const contactIdsForList = contacts.slice(0, 2).map((c) => c.id);
  await strapi.entityService.create('api::list.list', {
    data: {
      name: 'Seeded Contact List',
      title: 'Example List for Testing',
      contacts: contactIdsForList,
      publishedAt: new Date().toISOString(),
    },
  });

  // 5.3: Create 1 Organization and assign 1 contact to it
  const contactForOrg = contacts[0];
  await strapi.entityService.create('api::organization.organization', {
    data: {
      name: `Seeded Org ${faker.company.name()}`,
      email: faker.internet.email(),
      address_line1: faker.location.streetAddress(),
      location: faker.location.city(),
      contact_person: `${contactForOrg.first_name} ${contactForOrg.last_name}`,
      zip: faker.location.zipCode(),
      country: faker.location.countryCode(),
      url: faker.internet.url(),
      phone: faker.phone.number('+41 ## ### ## ##'),
      description: faker.company.catchPhrase(),
      status: 'new',
      canton: 'ZH',
      language: 'en',
      contacts: [contactForOrg.id],
      publishedAt: new Date().toISOString(),
    },
  });

  console.log('✅ Seeded all linked entities for temporary contacts.');
}

module.exports = {
  createReadonlyRole,
  createAdminRole,
  ensureLocalesAndConsents,
  populateStartupEntry,
  populateStartupEntryWithAdjustments,
  createSuperAdminUserIfNotExist,
  cleanupPermissions,
  applyFeatureFlags,
  seedEntities,
  createSuperAdminTest,
  createApiTokenTest,
  seedLinkedEntitiesForTempUsers,
  seedJobTitles,
  seedCommonEntities
};
