'use strict';

const path = require('path'); // For handling file paths
const fs = require('fs'); // For reading files
const { ensureLocalesAndConsents, createSuperAdminUserIfNotExist, createReadonlyRole, createAdminRole, populateStartupEntry, populateStartupEntryWithAdjustments, cleanupPermissions, applyFeatureFlags, seedEntities, createSuperAdminTest, createApiTokenTest, seedLinkedEntitiesForTempUsers, seedCommonEntities } = require('./functions');
const { setUpJourneysWebhook } = require('./create-journeys-webhooks')
function generatePassword() {
  const base = "nowtec";
  const symbols = "!@#$%^&*()_+-=[]{}|;:',.<>/?`~";
  let randomSymbols = "";

  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * symbols.length);
    randomSymbols += symbols[randomIndex];
  }

  return base + randomSymbols;
}

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */

  register(/*{ strapi }*/) {
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }) {
    (async () => {
      /**
       * This function start when service starts, and it is used to populate with some data
       * when service get deployed
       */

      const publishedAt = new Date().getTime();
      const data = {
        channels: [
          { name: "Email", publishedAt: publishedAt, editor_text_type: 'html', file_upload_type: "all", removeHtml: false, max_content_lenght: 50000 },
          { name: "SMS", publishedAt: publishedAt, editor_text_type: 'text', file_upload_type: "none", removeHtml: true, max_content_lenght: 70 },
          { name: "WhatsApp", publishedAt: publishedAt, editor_text_type: 'text', file_upload_type: "image", removeHtml: true, max_content_lenght: 300 },
          { name: "Twitter", publishedAt: publishedAt, editor_text_type: 'text', file_upload_type: "image", removeHtml: true, max_content_lenght: 280 },
          { name: "Telegram", publishedAt: publishedAt, editor_text_type: 'text', file_upload_type: "image", removeHtml: true, max_content_lenght: 50000 },
          { name: "LinkedIn", publishedAt: publishedAt, editor_text_type: 'text', file_upload_type: "image", removeHtml: true, max_content_lenght: 3000 },
          // { name: "Linkedin_Messaging", publishedAt: publishedAt, editor_text_type: 'text', file_upload_type: "none", removeHtml: true, max_content_lenght: 300 },
          { name: "Linkedin_Invitations", publishedAt: publishedAt, editor_text_type: 'text', file_upload_type: "none", removeHtml: true, max_content_lenght: 300 },
          { name: "Blog", publishedAt: publishedAt, editor_text_type: 'text', file_upload_type: "all", removeHtml: true, max_content_lenght: 50000 }
        ],
        contact_interest: [
          { name: "AI and LLMs", publishedAt: publishedAt },
          { name: "Automations, n8n, make", publishedAt: publishedAt },
          { name: "Data, Business Intelligence", publishedAt: publishedAt },
          { name: "General Tech Support", publishedAt: publishedAt },
          { name: "nowCDP", publishedAt: publishedAt },
          { name: "nowCRM", publishedAt: publishedAt }
        ],
        media_type: [
          { name: "Newspaper", publishedAt: publishedAt },
          { name: "Radio", publishedAt: publishedAt },
          { name: "Tv", publishedAt: publishedAt },
        ],
        frequency: [
          { name: "Daily", publishedAt: publishedAt },
          { name: "Weekly", publishedAt: publishedAt },
          { name: "Monthly", publishedAt: publishedAt }
        ],
        department: [
          { name: "Sport", publishedAt: publishedAt },
          { name: "Politics", publishedAt: publishedAt },
          { name: "Beauty", publishedAt: publishedAt },
          { name: "Buisiness", publishedAt: publishedAt },
          { name: "Meteo", publishedAt: publishedAt },
          { name: "Tecnology", publishedAt: publishedAt },
        ],
        keyword: [
          { name: "Zurich", publishedAt: publishedAt },
          { name: "Human right", publishedAt: publishedAt },
          { name: "Climante", publishedAt: publishedAt },
          { name: "Camping", publishedAt: publishedAt },
          { name: "Food", publishedAt: publishedAt },
          { name: "Relax", publishedAt: publishedAt },
          { name: "Footbal", publishedAt: publishedAt },
        ],
        rank: [
          { name: "Class A", publishedAt: publishedAt },
          { name: "Class B", publishedAt: publishedAt },
          { name: "Class C", publishedAt: publishedAt },
        ],
        contact: [
          {
            email: "temporary1@email.com",
            function: "Volunteer",
            plz: "3004",
            language: "en",
            locale: "en",
            address_line1: "31 Green Street, Berlin",
            first_name: "John",
            last_name: "Deer",
            gender: "male",
            phone: "+4915112345678",
            mobile_phone: "+4917123456789",
            canton: "BE",
            country: "Germany",
            priority: "p3",
            status: "new",
            description: "Interested in environmental causes.",
            linkedin_url: "https://linkedin.com/in/johndeer",
            facebook_url: "https://facebook.com/john.deer",
            twitter_url: "https://twitter.com/johndeer",
            website_url: "https://johnvolunteers.org",
            address_line2: "Apt 5B",
            location: "Berlin",
            zip: 3004,
            last_access: new Date().toISOString(),
            account_created_at: new Date().toISOString(),
            birth_date: "1985-07-01",
            publishedAt,
          },
          {
            email: "temporary2@email.com",
            function: "Campaigner",
            plz: "5006",
            language: "en",
            locale: "en",
            address_line1: "8 Via del Lagusel, Vittorio Veneto",
            first_name: "Giovani",
            last_name: "Chiccolini",
            gender: "male",
            phone: "+390438123456",
            mobile_phone: "+393498765432",
            canton: "TV",
            country: "Italy",
            priority: "p2",
            status: "contacted",
            description: "Leads regional campaigns on human rights.",
            linkedin_url: "https://linkedin.com/in/giovanichiccolini",
            facebook_url: "https://facebook.com/giovani.chiccolini",
            twitter_url: "https://twitter.com/giovanichic",
            website_url: "https://chiccoliniactivism.it",
            address_line2: "",
            location: "Vittorio Veneto",
            zip: 5006,
            last_access: new Date().toISOString(),
            account_created_at: new Date().toISOString(),
            birth_date: "1990-04-12",
            publishedAt,
          },
          {
            email: "temporary3@email.com",
            function: "Teacher",
            plz: "1010",
            language: "fr",
            locale: "fr",
            address_line1: "12 Rue de l'École, Lausanne",
            first_name: "Claire",
            last_name: "Morel",
            gender: "female",
            phone: "+41211234567",
            mobile_phone: "+41765432109",
            canton: "VD",
            country: "Switzerland",
            priority: "p4",
            status: "registered",
            description: "Primary school teacher supporting education initiatives.",
            linkedin_url: "https://linkedin.com/in/clairemorel",
            facebook_url: "",
            twitter_url: "",
            website_url: "",
            address_line2: "Room 204",
            location: "Lausanne",
            zip: 1010,
            last_access: new Date().toISOString(),
            account_created_at: new Date().toISOString(),
            birth_date: "1980-11-23",
            publishedAt,
          },
          {
            email: "temporary4@email.com",
            function: "Doctor",
            plz: "8050",
            language: "de",
            locale: "de",
            address_line1: "22 Bahnhofstrasse, Zürich",
            first_name: "Markus",
            last_name: "Keller",
            gender: "male",
            phone: "+41448765432",
            mobile_phone: "+41791234567",
            canton: "ZH",
            country: "Switzerland",
            priority: "p1",
            status: "negotiating",
            description: "Supports community health initiatives.",
            linkedin_url: "https://linkedin.com/in/markuskeller",
            facebook_url: "",
            twitter_url: "",
            website_url: "",
            address_line2: "",
            location: "Zürich",
            zip: 8050,
            last_access: new Date().toISOString(),
            account_created_at: new Date().toISOString(),
            birth_date: "1975-02-14",
            publishedAt,
          },
          {
            email: "temporary5@email.com",
            function: "Developer",
            plz: "4051",
            language: "en",
            locale: "en",
            address_line1: "45 Coding Lane, Basel",
            first_name: "Anna",
            last_name: "Schneider",
            gender: "female",
            phone: "+41612345678",
            mobile_phone: "+41789876543",
            canton: "BS",
            country: "Switzerland",
            priority: "p5",
            status: "backfill",
            description: "Helps build software tools for NGO work.",
            linkedin_url: "https://linkedin.com/in/annaschneider",
            facebook_url: "",
            twitter_url: "https://twitter.com/annasch_dev",
            website_url: "https://annaschneider.dev",
            address_line2: "Tech Hub 3A",
            location: "Basel",
            zip: 4051,
            last_access: new Date().toISOString(),
            account_created_at: new Date().toISOString(),
            birth_date: "1992-09-09",
            publishedAt,
          }
        ],
        contact_type: [
          { name: "Contact", desciption: "An unqualified contact.", publishedAt: publishedAt },
          { name: "Lead", desciption: "A potential contact who has shown interest but not yet made a purchase.", publishedAt: publishedAt },
          { name: "Customer", desciption: "Contact has completed a purchase or deal.", publishedAt: publishedAt },
          { name: "Unsubscribed", desciption: "Contact has opted out of communications.", publishedAt: publishedAt },
          { name: "Bounced", desciption: "Email address is invalid or undeliverable.", publishedAt: publishedAt },
          { name: "Inactive User ", desciption: "Email is no longer current or in use.", publishedAt: publishedAt },
          { name: "Past Customer", desciption: "Previously a customer, but no longer active.", publishedAt: publishedAt },
          { name: "Partner", desciption: "Not a client, but associated with your business.", publishedAt: publishedAt },
          { name: "Vendor", desciption: "Not a client, but associated with your business.", publishedAt: publishedAt },
          { name: "Supporter", desciption: "Not a client, but associated with your business.", publishedAt: publishedAt },
          { name: "Volunteer", desciption: "Not a client, but associated with your business.", publishedAt: publishedAt },
          { name: "Donor", desciption: "Not a client, but associated with your business.", publishedAt: publishedAt },
        ],
        organization_type: [
          { name: "Einzelfirma", publishedAt: publishedAt },
          { name: "GmbH", publishedAt: publishedAt },
          { name: "AG", publishedAt: publishedAt },
          { name: "Verein", publishedAt: publishedAt },
          { name: "Stiftung", publishedAt: publishedAt },
          { name: "Genossenschaft", publishedAt: publishedAt },
        ],
        subsctiption_type: [
          { name: 'Basic', publishedAt: publishedAt }
        ],
        setting: [
          { linkedin_access_token: '', subscription: "verify", publishedAt: publishedAt }
        ],
        action_normalized_types: [
          { name: 'step_reached', publishedAt },
          { name: 'journey_finished', publishedAt },
        ],
        contact_title: [
          // English
          { name: "Ms", publishedAt: new Date().toISOString() },
          { name: "Mr", publishedAt: new Date().toISOString() },
          { name: "Dr", publishedAt: new Date().toISOString() },

          // French
          { name: "Mme", publishedAt: new Date().toISOString() },   // Madame
          { name: "M.", publishedAt: new Date().toISOString() },    // Monsieur
          { name: "Dr", publishedAt: new Date().toISOString() },    // Docteur

          // Italian
          { name: "Sig.ra", publishedAt: new Date().toISOString() }, // Signora
          { name: "Sig.", publishedAt: new Date().toISOString() },   // Signore
          { name: "Dott.", publishedAt: new Date().toISOString() },  // Dottore

          // German
          { name: "Frau", publishedAt: new Date().toISOString() },
          { name: "Herr", publishedAt: new Date().toISOString() },
          { name: "Dr", publishedAt: new Date().toISOString() },
        ],

        contact_salutation: [
          // English
          { name: "Dear Ms", publishedAt: new Date().toISOString() },
          { name: "Dear Mr", publishedAt: new Date().toISOString() },
          { name: "Dear Dr", publishedAt: new Date().toISOString() },

          // French
          { name: "Chère Mme", publishedAt: new Date().toISOString() },
          { name: "Cher M.", publishedAt: new Date().toISOString() },
          { name: "Cher Dr", publishedAt: new Date().toISOString() },

          // Italian
          { name: "Gentile Sig.ra", publishedAt: new Date().toISOString() },
          { name: "Gentile Sig.", publishedAt: new Date().toISOString() },
          { name: "Gentile Dott.", publishedAt: new Date().toISOString() },

          // German
          { name: "Sehr geehrte Frau", publishedAt: new Date().toISOString() },
          { name: "Sehr geehrter Herr", publishedAt: new Date().toISOString() },
          { name: "Sehr geehrter Dr", publishedAt: new Date().toISOString() },
        ],
      }

      await ensureLocalesAndConsents(strapi);
      await populateStartupEntryWithAdjustments(strapi, 'api::channel.channel', data.channels);
      await populateStartupEntryWithAdjustments(strapi, 'api::contact-interest.contact-interest', data.contact_interest);
      await populateStartupEntryWithAdjustments(strapi, 'api::media-type.media-type', data.media_type);
      await populateStartupEntryWithAdjustments(strapi, 'api::frequency.frequency', data.frequency);
      await populateStartupEntryWithAdjustments(strapi, 'api::department.department', data.department);
      await populateStartupEntryWithAdjustments(strapi, 'api::rank.rank', data.rank);
      await populateStartupEntryWithAdjustments(strapi, 'api::keyword.keyword', data.keyword);
      await populateStartupEntry(strapi, 'api::contact.contact', data.contact);
      await populateStartupEntry(strapi, 'api::action-normalized-type.action-normalized-type', data.action_normalized_types);
      await populateStartupEntryWithAdjustments(strapi, 'api::contact-type.contact-type', data.contact_type);
      await populateStartupEntryWithAdjustments(strapi, 'api::organization-type.organization-type', data.organization_type);
      await populateStartupEntryWithAdjustments(strapi, 'api::subscription-type.subscription-type', data.subsctiption_type);
      await populateStartupEntryWithAdjustments(strapi, 'api::contact-title.contact-title', data.contact_title);
      await populateStartupEntryWithAdjustments(strapi, 'api::contact-salutation.contact-salutation', data.contact_salutation);
      await populateStartupEntry(strapi, 'api::setting.setting', data.setting);

      // read and seed industries
      const dataFilePath = path.join(__dirname, 'industries.json');
      const rawData = fs.readFileSync(dataFilePath, 'utf-8');
      const industries = JSON.parse(rawData);
      await populateStartupEntry(strapi, 'api::industry.industry', industries);

      // ✅ All dependencies seeded; now call linked seeder
      // Check if linked entities are already seeded
      const tempContactEmails = [
        'temporary1@email.com',
        'temporary2@email.com',
        'temporary3@email.com',
        'temporary4@email.com',
        'temporary5@email.com',
      ];

      const existingActions = await strapi.db.query('api::action.action').count({
        where: {
          contact: {
            email: {
              $in: tempContactEmails
            }
          }
        }
      });

      if (existingActions === 0) {
        await seedLinkedEntitiesForTempUsers(strapi);
      } else {
        console.log('Skipping seedLinkedEntitiesForTempUsers – already seeded.');
      }

      // create Roles
      cleanupPermissions(strapi);
      createAdminRole(strapi);
      if (process.env.NT_ACTIVE_SERVICES && process.env.NT_ACTIVE_SERVICES.includes("journeys")) {
        setUpJourneysWebhook(strapi)
      }
      const adminPassword = generatePassword();
      createSuperAdminUserIfNotExist(strapi, process.env.STRAPI_STANDART_EMAIL_STRAPI, adminPassword);
      //test
      createSuperAdminTest(strapi, process.env.STRAPI_TEST_ADMIN_EMAIL, process.env.STRAPI_TEST_ADMIN_PASSWORD);
      createApiTokenTest(strapi);

      applyFeatureFlags(strapi);
      seedCommonEntities(strapi); // Seed common entities for all installations
      seedEntities(strapi); // Seed test data for customer installations
    })().catch((err) => {
      console.error("Error during bootstrap:", err);
    });
  }
}
