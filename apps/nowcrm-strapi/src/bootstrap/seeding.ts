// src/bootstrap/seeding.ts
import fs from "fs";
import { Core, UID } from '@strapi/strapi';

/**
 * Ensures necessary locales and consents exist.
 */
export async function ensureLocalesAndConsents(strapi: Core.Strapi): Promise<void> {
  const localesToEnsure = ["en", "de", "it", "fr"];
  const existingLocales = await strapi.plugin("i18n").service("locales").find();
  const missingLocales = localesToEnsure.filter(
    (locale) => !existingLocales.some((l) => l.code === locale)
  );

  for (const locale of missingLocales) {
    try {
      await strapi.plugin("i18n").service("locales").create({ code: locale, name: locale });
      console.log(`🌍 Created missing locale '${locale}'`);
    } catch (error) {
      console.error(`❌ Failed to create locale '${locale}':`, error);
    }
  }

  const publishedAt = new Date().getTime();
  const consents: Record<string, any> = {
    en: { version: "1", title: "Privacy Policy", text: "", locale: "en", active: true, publishedAt },
    de: { version: "1", title: "Datenschutzerklärung", text: "", locale: "de", active: true, publishedAt },
    fr: { version: "1", title: "Politique de confidentialité", text: "", locale: "fr", active: true, publishedAt },
    it: { version: "1", title: "Informativa sulla privacy", text: "", locale: "it", active: true, publishedAt },
  };

  const version = consents.en.version;
  const missingConsents: string[] = [];

  for (const locale of localesToEnsure) {
    const existing = await strapi.entityService.findMany("api::consent.consent", {
      filters: { version },
      locale,
    });
    if (!existing || existing.length === 0) missingConsents.push(locale);
  }

  if (missingConsents.length === 0) {
    console.log(" All locales already have version 1 consent");
    return;
  }

  for (const locale of missingConsents) {
    try {
      const path = `${__dirname}/consent_${locale}.md`;
      const text = fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
      await strapi.entityService.create("api::consent.consent", { data: { ...consents[locale], text } });
      console.log(` Created consent for locale '${locale}'`);
    } catch (err) {
      console.error(` Error creating consent for '${locale}':`, err);
    }
  }
}

export async function populateStartupEntry<T extends UID.ContentType>(
  strapi: Core.Strapi,
  api: T,
  data: Record<string, any>[]
): Promise<string[]> {
  try {
    const count = await strapi.documents(api).count({});
      if (count !== 0) return [];

    const ids = await Promise.all(
      data.map(async (item) => {
        const created = await strapi.documents(api).create({
          data: item as any  // find fix 
            });
        return created.documentId as string;
      })
    );

    console.log(` Populated ${api} (${ids.length})`);
    return ids;
  } catch (err: any) {
    console.error(` populateStartupEntry error for ${api}:`, err.message);
    return [];
  }
}


/**
 * Populate with adjustments if some entries already exist.
 */
export async function populateStartupEntryWithAdjustments<T extends UID.ContentType>(
  strapi: Core.Strapi,
  api: T,
  data: Record<string, any>[]
): Promise<string[]> {
  try {
    // Fetch existing documents using the Document Service API
    const existing = await strapi.documents(api).findMany();

    if (existing.length === 0) {
      return await populateStartupEntry(strapi, api, data);
    }

    const existingNames = existing.map((doc: any) => doc.name);
    const newItems = data.filter((d) => !existingNames.includes(d.name));

    if (newItems.length > 0) {
      const newDocumentIds = await Promise.all(
        newItems.map(async (item) => {
          const res = await strapi.documents(api).create({
            data: item as any, //fix
          });
          return res.documentId as string;
        })
      );

      console.log(` Added ${newDocumentIds.length} missing ${api} entries`);

      return [
        ...existing.map((doc: any) => doc.documentId),
        ...newDocumentIds,
      ];
    }

    return existing.map((doc: any) => doc.documentId);
  } catch (err: any) {
    console.error(` populateStartupEntryWithAdjustments error for ${api}:`, err.message);
    return [];
  }
}

/**
 * Seeds Job Titles
 */
export async function seedJobTitles(strapi: Core.Strapi): Promise<void> {
  const count = await strapi.query("api::contact-job-title.contact-job-title").count();
  if (count > 0) return;

  const titles = [
    "Administrative",
    "Consulting",
    "Customer Service",
    "Education",
    "Engineering",
    "Finance",
    "Healthcare",
    "Human Resources",
    "Information Technology",
    "Legal",
    "Management",
    "Marketing",
    "Operations",
    "Research",
    "Sales",
  ].map((name) => ({ name, publishedAt: new Date().toISOString() }));

  await strapi.query("api::contact-job-title.contact-job-title").createMany({ data: titles });
  console.log(" Job titles seeded");
}

/**
 * Seeds Campaign Categories and Campaigns.
 */
export async function seedCommonEntities(strapi: Core.Strapi): Promise<void> {
  await seedJobTitles(strapi);

  const categoriesCount = await strapi.query("api::campaign-category.campaign-category").count();
  if (categoriesCount === 0) {
    await strapi.query("api::campaign-category.campaign-category").createMany({
      data: [
        { name: "Fundraising", description: "Campaigns to raise funds", publishedAt: new Date().toISOString() },
        { name: "Awareness", description: "Campaigns to raise awareness", publishedAt: new Date().toISOString() },
        { name: "Engagement", description: "Campaigns to build community", publishedAt: new Date().toISOString() },
      ],
    });
    console.log(" Campaign categories seeded");
  }

  const campaignsCount = await strapi.query("api::campaign.campaign").count();
  if (campaignsCount === 0) {
    const categories = await strapi.query("api::campaign-category.campaign-category").findMany();
    const fundraising = categories.find((c) => c.name === "Fundraising");
    const awareness = categories.find((c) => c.name === "Awareness");
    const engagement = categories.find((c) => c.name === "Engagement");

    const campaigns = [
      {
        name: "Climate Action Initiative",
        description:
          "Join our mission to combat climate change. Help us reach our goal to plant 10,000 trees.",
        campaign_category: awareness?.id || categories[0]?.id,
      },
      {
        name: "Annual Donation Drive",
        description: "Support our community programs with your donations.",
        campaign_category: fundraising?.id || categories[0]?.id,
      },
      {
        name: "Volunteer Recruitment Campaign",
        description: "Join our team of volunteers for impactful action.",
        campaign_category: engagement?.id || categories[0]?.id,
      },
    ];

    for (const c of campaigns) {
      await strapi.entityService.create("api::campaign.campaign", {
        data: { ...c, publishedAt: new Date().toISOString() },
      });
    }
    console.log(" Campaigns seeded");
  }
}

/**
 * Seeds entities for MemberSpace environments.
 */
export async function seedEntities(strapi: Core.Strapi): Promise<void> {
  const { faker } = await import("@faker-js/faker");
  const isMemberSpace = process.env.STRAPI_NEXT_PUBLIC_FEATURE_FOR_MEMBERSPACE === "true";
  if (!isMemberSpace) return;

  const usersCount = await strapi.query("plugin::users-permissions.user").count();
  if (usersCount === 0) {
    const users = Array.from({ length: 5 }).map(() => ({
      username: faker.internet.username(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      confirmed: true,
      blocked: false,
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      is_active: faker.datatype.boolean(),
      gender: faker.helpers.arrayElement(["female", "male"]),
      phone: faker.phone.number(),
      address: faker.location.streetAddress(),
      postal_code: faker.location.zipCode(),
      subscribed: faker.datatype.boolean(),
      language_code: faker.helpers.arrayElement(["en", "de", "fr", "it"]),
    }));
    await strapi.query("plugin::users-permissions.user").createMany({ data: users });
    console.log(" Users seeded");
  }
}

/**
 * Seeds linked data for temporary contacts (CRM test data)
 */
export async function seedLinkedEntitiesForTempUsers(strapi: Core.Strapi): Promise<void> {
  const { faker } = await import("@faker-js/faker");

  const TEMP_EMAILS = [
    "temporary1@email.com",
    "temporary2@email.com",
    "temporary3@email.com",
    "temporary4@email.com",
    "temporary5@email.com",
  ];

  const contacts = await strapi.db.query("api::contact.contact").findMany({
    where: { email: { $in: TEMP_EMAILS } },
  });

  if (!contacts.length) {
    console.warn("⚠️ No temporary contacts found");
    return;
  }

  const [normalizedTypes, channels] = await Promise.all([
    strapi.entityService.findMany("api::action-type.action-type"),
    strapi.entityService.findMany("api::channel.channel"),
  ]);

  if (!normalizedTypes.length || channels.length < 3) {
    console.warn("⚠️ Missing action types or not enough channels");
    return;
  }

  const comp = await strapi.entityService.create("api::composition.composition", {
    data: {
      name: "Seeded Test Composition",
      category: "Newsletter",
      language: "en",
      subject: "Test subject",
      reference_prompt: "Generate message for supporters",
      status: "Finished",
      publishedAt: new Date().toISOString(),
    },
  });

  for (const ch of channels.slice(0, 3)) {
    await strapi.entityService.create("api::composition-item.composition-item", {
      data: {
        result: faker.lorem.paragraph(),
        publication_date: faker.date.past({ years: 1 }),
        status: "Published",
        channel: ch.id,
        composition: comp.id,
        publishedAt: new Date().toISOString(),
      },
    });
  }

  console.log(" Linked entities for temp users seeded");
}