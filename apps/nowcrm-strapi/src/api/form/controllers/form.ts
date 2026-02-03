/**
 * composition controller
 */

import { Core, factories } from '@strapi/strapi'

const CLONE_MEDIA_FILES = false;

async function cloneAssetIfNeeded(
  asset: { id: number } | null | undefined
): Promise<number | null> {
  if (!asset) return null;
  if (!CLONE_MEDIA_FILES) {
    return asset.id;
  }
  // Implement media clone logic if you enable CLONE_MEDIA_FILES
  return asset.id;
}

async function uniqueSlug(
  strapi: Core.Strapi,
  baseSlug: string
): Promise<string> {
  const clean = baseSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const candidates: string[] = [clean, `${clean}-copy`];
  let n = 2;
  let slug = candidates[0];

  for (;;) {
    const existing = await strapi.documents('api::form.form').findMany({
      filters: { slug },
      limit: 1,
      fields: ['id'],
    });
    if (!existing || existing.length === 0) {
      return slug;
    }
    if (candidates.length > 0) {
      slug = candidates.shift() as string;
      continue;
    }
    slug = `${clean}-copy-${n++}`;
  }
}

async function deepDuplicateFormItem(
  strapi: Core.Strapi,
  originalItem: any,
  newFormId: any,
  trx: any
): Promise<any> {
  const {
    id: _itemId,
	documentId: _documentId,
    createdAt: _c,
    updatedAt: _u,
    publishedAt: _p,
    form: _f,
    ...itemData
  } = originalItem;

  if (itemData.media) {
    const media = itemData.media;
    if (Array.isArray(media)) {
      // If array
      itemData.media = await Promise.all(
        media.map(async m => ({ id: await cloneAssetIfNeeded(m) }))
      );
    } else {
      itemData.media = { id: await cloneAssetIfNeeded(media) };
    }
  }

  const created = await strapi.documents('api::form-item.form-item').create( {
    data: {
      ...itemData,
      form: newFormId,
    },
    transacting: trx,
  });
  return created;
}

async function ensureSubscription({
	contact,
	channelName,
	shouldSubscribe
}: {
	contact: any;
	channelName: string;
	shouldSubscribe: boolean;
}) {
	if (!contact || !shouldSubscribe) return;

	try {
		const now = new Date().toISOString();

		// 1️⃣ Find channel by name (case-insensitive)
		const channels = await strapi
			.documents('api::channel.channel')
			.findMany({
				filters: { name: { $containsi: channelName } },
				limit: 1
			});

		const channel = channels?.[0] ?? null;

		if (!channel) {
			console.warn(`⚠️ No '${channelName}' channel found. Skipping subscription.`);
			return;
		}

		// 2️⃣ Check existing subscription
		const existingSubs = await strapi
			.documents('api::subscription.subscription')
			.findMany({
				filters: {
					channel: { documentId: channel.documentId },
					contact: { documentId: contact.documentId }
				},
				limit: 1
			});

		const existing = existingSubs?.[0] ?? null;

		if (existing) {
			await strapi
				.documents('api::subscription.subscription')
				.update({
					documentId: existing.documentId,
					data: {
						active: true,
						unsubscribed_at: null,
						subscribed_at: now,
						publishedAt: now
					} as any
				});

			console.log(`🔁 Reactivated ${channelName} subscription for ${contact.email}`);
		} else {
			await strapi
				.documents('api::subscription.subscription')
				.create({
					data: {
						channel: channel.id,
						contact: contact.id,
						subscribed_at: now,
						active: true,
						publishedAt: now
					}
				});

			console.log(`✅ Created ${channelName} subscription for ${contact.email}`);
		}
	} catch (err) {
		console.warn(`⚠️ Failed to process ${channelName} subscription:`, err);
	}
}

function escapeCsvValue(value: unknown): string {
	if (value === null || value === undefined) return "";
	const text = String(value);
	return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv(headers: string[], rows: string[][]): string {
	const headerLine = headers.map(escapeCsvValue).join(",");
	const body = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
	return `${headerLine}\r\n${body}`;
}

export default factories.createCoreController('api::form.form', ({ strapi }) => ({
async duplicate(ctx) {
    const { id } = ctx.request.body;
    const user = ctx.state.user;

    if (!id) return ctx.badRequest('Missing form ID');
    if (!user) return ctx.unauthorized('User not authenticated');

    // Optional: ensure user can duplicate this form
    // e.g., check ownership here

    try {
      // Populate deeply enough for form_items and their nested fields
      const original = await strapi.documents("api::form.form").findOne({
        documentId: id,
        populate: {
          cover: true,
          logo: true,
          form_items: { populate: '*' },
        },
      });

      if (!original) return ctx.notFound('Original form not found');

      // Strip meta fields
      const {
        id: _id,
		documentId: _documentId,
        createdAt: _c,
        updatedAt: _u,
        publishedAt: _p,
        form_items,
        // Keep base fields
        ...baseData
      } = original;

      // Prepare media ids, optionally cloning
      const coverId = await cloneAssetIfNeeded(original.cover);
      const logoId = await cloneAssetIfNeeded(original.logo);

      // Unique slug
      const slugBase = `${original.slug || original.name || 'form'}`;
      const finalSlug = await uniqueSlug(strapi,`${slugBase}-copy`);

      // Use a transaction for all creates
      const result = await strapi.db.transaction(async ({ trx }) => {
        const newForm = await strapi.documents("api::form.form").create({
          data: {
            ...baseData,
            name: `${original.name} (Copy)`,
            slug: finalSlug,
            active: false,
            cover: coverId || null,
			logo:  logoId || null,
          },
          transacting: trx,
        });

        if (Array.isArray(form_items) && form_items.length > 0) {
          for (const item of form_items) {
            await deepDuplicateFormItem(strapi ,item, newForm.id, trx);
          }
        }

        return newForm;
      });

      return ctx.send({ success: true, data: result }, 201);
    } catch (err) {
		console.log(err)
      return ctx.send(
        {
          success: false,
          message: 'Failed to duplicate form',
          error: err?.message || String(err),
        },
        500
      );
    }
  },

  async exportResults(ctx) {
    const formId =
      ctx?.query?.formId ||
      ctx?.query?.id ||
      ctx?.params?.id;
    const user = ctx.state.user;

    if (!formId) {
      console.warn('[exportResults] missing formId', {
        query: ctx?.query,
        params: ctx?.params,
      });
      return ctx.badRequest('Missing form ID');
    }
    if (!user) {
      console.warn('[exportResults] unauthenticated request', {
        formId,
      });
      return ctx.unauthorized('User not authenticated');
    }

    try {
      const populate = {
        form_items: {
          fields: ['label', 'name', 'rank', 'hidden'] as const,
        },
      } as any;

      let form: any = await strapi.documents('api::form.form').findOne({
        documentId: String(formId),
        populate,
      });

      if (!form) {
        const numericId = Number(formId);
        if (!Number.isNaN(numericId)) {
          console.log('[exportResults] lookup by numeric id', { id: numericId });
          form = await strapi.db.query('api::form.form').findOne({
            where: { id: numericId },
            populate,
          });
        }
      }

      if (!form) {
        console.warn('[exportResults] form not found', {
          formId,
        });
        return ctx.notFound('Form not found');
      }

      const formItems = Array.isArray(form.form_items) ? form.form_items : [];
      const sortedItems = [...formItems].sort((a, b) => {
        const ra = Number(a?.rank ?? 0);
        const rb = Number(b?.rank ?? 0);
        if (Number.isNaN(ra) && Number.isNaN(rb)) return 0;
        if (Number.isNaN(ra)) return 1;
        if (Number.isNaN(rb)) return -1;
        return ra - rb;
      });
      const headers = [
        'contact_id',
        ...sortedItems.map((item) =>
          (item?.label || item?.name || `field_${item?.id || ''}`).trim(),
        ),
      ];

      const surveyFormId = String(form?.documentId || formId);
      const where = { form_id: surveyFormId };
      const total = await strapi.db.query('api::survey.survey').count({ where });
      const pageSize = 100;
      const surveys: any[] = [];

      for (let offset = 0; offset < total; offset += pageSize) {
        const batch = await strapi.db.query('api::survey.survey').findMany({
          where,
          orderBy: { id: 'asc' },
          limit: pageSize,
          offset,
          populate: {
            contact: {
              fields: ['documentId', 'email', 'first_name', 'last_name'],
            },
            survey_items: {
              populate: {
                file: {
                  fields: ['name', 'url'],
                },
              },
            },
          },
        });
        surveys.push(...(batch || []));
      }

      const rows: string[][] = [];
      const toKey = (value: unknown) => String(value || '').trim().toLowerCase();

      for (const survey of surveys || []) {
        const items = Array.isArray(survey.survey_items)
          ? survey.survey_items
          : [];

        const answerMap = new Map<string, string[]>();
        for (const item of items) {
          const key = toKey(item?.question);
          if (!key) continue;
          const value =
            item?.answer ||
            item?.file?.url ||
            item?.file?.name ||
            '';
          if (!answerMap.has(key)) answerMap.set(key, []);
          if (value !== '') answerMap.get(key)?.push(String(value));
        }

        const row = [
          String(survey?.contact?.documentId || ''),
          ...sortedItems.map((item) => {
          const labelKey = toKey(item?.label);
          const nameKey = toKey(item?.name);
          const values =
            (labelKey && answerMap.get(labelKey)) ||
            (nameKey && answerMap.get(nameKey)) ||
            [];
          return values.length > 0 ? values.join('; ') : '';
        }),
        ];

        rows.push(row);
      }

      const csv = buildCsv(headers, rows);
      ctx.set('Content-Type', 'text/csv; charset=utf-8');
      ctx.set(
        'Content-Disposition',
        `attachment; filename=\"form_${surveyFormId}_results.csv\"`,
      );
      ctx.body = csv;
    } catch (err) {
      console.error('Export form results error:', err);
      return ctx.send(
        {
          success: false,
          message: 'Export form results failed',
          error: err?.message,
        },
        500,
      );
    }
  },

  async formSubmit(ctx) {
		const { body, files } = ctx.request;
		const { ip } = ctx.request;

		if (body.identifier) {
        	body.identifier = String(body.identifier).trim().toLowerCase();
		}


		// 🔁 Reconstruct nested formData
		if (!body.formData || typeof body.formData !== "object") {
			body.formData = {};
			for (const [key, value] of Object.entries(body)) {
				const match = key.match(/^formData\[(.+?)\]$/);
				if (match) {
					const fieldKey = match[1];
					body.formData[fieldKey] = value;
				}
			}
		}

		console.log('(formSubmit) BODY:', body);

		if (!body.formId) {
			return { success: false, message: "Form ID not found" };
		}

		// 1️⃣ Fetch form with override_contact
		const form = await strapi.documents('api::form.form').findOne({
			documentId: body.formId,
			filters: { active: true },
			fields: ['name', 'slug', 'override_contact', 'keep_contact', 'webhook_url', 'submit_confirm_text']
		});

		if (!form) {
			return { success: false, message: "Requested form not found or inactive" };
		}

		// 2️⃣ Lookup or create contact
		let contact = null;
		let isNewContact = false;
		
		if (form.keep_contact && body.identifier) {
		  const contacts = await strapi.documents('api::contact.contact').findMany({
			filters: { email: { $eqi: body.identifier } },
			limit: 1
		  });
		  contact = contacts && contacts.length > 0 ? contacts[0] : null;
		
		  if (!contact) {
			contact = await strapi.documents('api::contact.contact').create({
			  data: {
				email: body.identifier,
				publishedAt: new Date().toISOString()
			  }
			});
			isNewContact = true;
		  }
		}
		

		// 🔍 Fuzzy matching helpers
		function levenshtein(a, b) {
			const an = a.length;
			const bn = b.length;
			if (an === 0) return bn;
			if (bn === 0) return an;

			const matrix = Array.from({ length: bn + 1 }, (_, i) => [i]);
			for (let j = 0; j <= an; j++) matrix[0][j] = j;

			for (let i = 1; i <= bn; i++) {
				for (let j = 1; j <= an; j++) {
					if (b[i - 1] === a[j - 1]) {
						matrix[i][j] = matrix[i - 1][j - 1];
					} else {
						matrix[i][j] = Math.min(
							matrix[i - 1][j - 1] + 1,
							matrix[i][j - 1] + 1,
							matrix[i - 1][j] + 1
						);
					}
				}
			}
			return matrix[bn][an];
		}

		function normalize(str) {
			return str.toLowerCase().replace(/[\s_-]+/g, '').trim();
		}

		function findClosestContactField(formKey, contactFields) {
			const ALIASES = {
				phone_number: 'phone',
				address_line_1: 'address_line1',
				address_line1: 'address_line1',
				website: 'website_url',
				linkedin: 'linkedin_url',
				twitter: 'twitter_url',
				facebook: 'facebook_url',
				zip: 'plz',
			};

			const normFormKey = normalize(formKey);
			if (ALIASES[normFormKey]) {
				return ALIASES[normFormKey];
			}

			let closest = null;
			let minDistance = Infinity;

			for (const field of contactFields) {
				const normField = normalize(field);

				// Bi-directional substring matching
				if (normField === normFormKey) return field;

				// Fuzzy matching fallback
				const distance = levenshtein(normFormKey, normField);
				if (distance <= 3 && distance < minDistance) {
					minDistance = distance;
					closest = field;
				}
			}

			return closest;
		}

		// 3️⃣ Update contact fields (including organization linking)
		if (contact && (isNewContact || form.override_contact)) {
			const contactModel = strapi.contentTypes["api::contact.contact"];
			const contactFields = Object.keys(contactModel.attributes || {});
			const updates : any = {};

			for (const [key, value] of Object.entries(body.formData)) {
				if (!value) continue;

				const isOrganization = normalize(key) === 'organization';
				const match = isOrganization
					? 'organization'
					: findClosestContactField(key, contactFields);

				if (!match) {
					console.warn(`⚠️ Unmatched contact field: ${key}`);
					continue;
				}

				if (match === 'email') {
				     updates.email = String(value).trim().toLowerCase();
				     continue;
				}

				// Special handling for organization relation
				if (match === 'organization') {
					const orgName = String(value);
					const orgs = await strapi.documents('api::organization.organization').findMany({
						filters: { name: orgName },
						limit: 1
					});
					let org = orgs && orgs.length > 0 ? orgs[0] : null;

					if (!org) {
						org = await strapi.documents('api::organization.organization').create({
							data: {
								name: orgName,
								publishedAt: new Date().toISOString()
							}
						});
						console.log(`🏢 Created new organization: ${orgName}`);
					} else {
						console.log(`🏢 Linked existing organization: ${orgName}`);
					}

					updates.organization = org.documentId;
				} else {
					updates[match] = value;
				}
			}

			if (Object.keys(updates).length > 0) {
				console.log('🔁 Updating contact with:', updates);
				await strapi.documents('api::contact.contact').update({
                    documentId: contact.documentId,
					data: updates,
				});
			}
		}


		// 3️⃣.b Create subscription if "subscribe" field is present and truthy
		const shouldSubscribe = Object.entries(body.formData).some(
			([key, val]) => normalize(key).includes('subscribe') && String(val).toLowerCase() === 'true'
		);

		if (contact && shouldSubscribe) {
			await ensureSubscription({
				contact,
				channelName: 'email',
				shouldSubscribe
			});
			
			await ensureSubscription({
				contact,
				channelName: 'sms',
				shouldSubscribe
			});
			
			await ensureSubscription({
				contact,
				channelName: 'whatsapp',
				shouldSubscribe
			});
		}

		// 4️⃣ Create survey
		const surveyData : any = {
			form_id: body.formId,
			name: form.name,
			publishedAt: new Date()
		};
		if (contact) surveyData.contact = contact.documentId;

		const survey = await strapi.documents('api::survey.survey').create({ data: surveyData });

		if (!survey) {
			return { success: false, message: "Failed to create survey" };
		}

		// 5️⃣ Create survey items (with optional file)
		for (const [key, value] of Object.entries(body.formData)) {
			console.log('📝 inserting', key, value);

			const fileKey = `files.${key}`;
			const file = files?.[fileKey];

			const itemData : any = {
				survey: survey.documentId,
				question: key,
				answer: typeof value === 'string' ? value : undefined,
				publishedAt: new Date().toISOString()
			};

			if (contact) itemData.contact = contact.documentId;

			const createOptions : any = { data: itemData };

			if (file) {
				createOptions.files = {
					file: Array.isArray(file) ? file[0] : file
				};
			}

			await strapi.documents("api::survey-item.survey-item").create(createOptions);
		}




		// 6️⃣ Log event
		const eventData : any = {
			action: 'formSubmit',
			external_id: form.documentId,
			title: form.name,
			source: ip,
			status: 'success',
			payload: JSON.stringify(body),
			publishedAt: new Date().toISOString()
		};
		if (contact) eventData.contact = contact.documentId;
		if (body.identifier) eventData.destination = body.identifier;

		await strapi.documents('api::event.event').create({ data: eventData });

		// 7️⃣ Optional webhook
		if (form?.webhook_url) {
			try {
				fetch(form.webhook_url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						identifier: body.identifier || null,
						formId: body.formId,
						surveyId: survey.documentId,
						formData: body.formData,
						originalForm: form
					})
				})
					.then(res => console.log('📡 Webhook sent:', res.status))
					.catch(err => console.error('⚠️ Webhook error:', err));
			} catch (err) {
				console.error('🔥 Webhook fire-and-forget failed:', err);
			}
		}


		// 8. Optional: send confirm email
		if (
			form.submit_confirm_text &&
			contact?.email &&
			form.submit_confirm_text.trim() !== ""
		) {
			try {
				// 1️⃣ Confirmation message (top)
				const confirmationMessage = form.submit_confirm_text.trim();

				// 2️⃣ Form submission data
				const submittedFieldsText = Object.entries(body.formData || {})
					.map(([key, value]) => `- ${key}: ${value}`)
					.join('\n');

				// 3️⃣ Meta info (bottom)
				const metaText = [
					'',
					`Form: ${form.name}`,
					`Submitted by: ${contact.email}`,
					`Date: ${new Date().toLocaleString()}`
				].join('\n');

				// 4️⃣ Final email body
				const finalText = [
					confirmationMessage,
					'',
					'Submitted Data:',
					submittedFieldsText,
					metaText
				].join('\n');

				// 5️⃣ Send the email
				await strapi
					.service('api::form.form')
					.sendConfirmationEmail({
						to: contact.email,
						text: finalText,
						submissionId: survey.documentId,
						subject: `${form.name}`,
					});
			} catch (err) {
				console.error("❌ Could not send confirmation email:", err);
			}
		}


		return { success: true, message: "Form successfully submitted" };
	}
}));
