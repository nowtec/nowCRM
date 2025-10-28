'use strict';

const { createCoreController } = require('@strapi/strapi').factories;


// Reuse assets by default. Flip to true only if you implement cloneAsset.
const CLONE_MEDIA_FILES = false;

// If you need true file cloning, implement this with upload service.
async function cloneAssetIfNeeded(asset) {
  if (!asset) return null;
  if (!CLONE_MEDIA_FILES) return asset.id;
  // cloning not implemented yet, so just reuse
  return asset.id;
}

function toIdOrNull(x) {
  return x && typeof x === 'object' && 'id' in x ? x.id : null;
}

function toIds(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value.map(v => toIdOrNull(v)).filter(Boolean);
  return toIdOrNull(value);
}

async function uniqueSlug(baseSlug) {
  const clean = baseSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Try base, then add -copy, -copy-2, -copy-3...
  const candidates = [clean, `${clean}-copy`];
  // Preload up to N to reduce queries if you want, but simple loop is fine
  let n = 2;
  let slug = candidates[0];
  for (;;) {
    const existing = await strapi.entityService.findMany('api::form.form', {
      filters: { slug },
      limit: 1,
      fields: ['id'],
    });
    if (!existing || existing.length === 0) return slug;
    // Move to next candidate
    if (candidates.length > 0) {
      slug = candidates.shift();
      continue;
    }
    slug = `${clean}-copy-${n++}`;
  }
}

async function deepDuplicateFormItem(originalItem, newFormId, trx) {
  // Strip meta fields
  const {
    id: _itemId,
    createdAt: _c,
    updatedAt: _u,
    publishedAt: _p,
    form: _f,
    // Keep the rest
    ...itemData
  } = originalItem;

  // Example: handle common nested media fields if present
  // Adjust this list to your model
  if (itemData.media) {
    const media = itemData.media;
    if (Array.isArray(media)) {
      itemData.media = await Promise.all(
        media.map(async m => ({ id: await cloneAssetIfNeeded(m) }))
      );
    } else {
      itemData.media = { id: await cloneAssetIfNeeded(media) };
    }
  }

  // If your form_item has components or dynamic zones, itemData already contains them
  // because we populated '*' below. entityService.create can take them as-is.

  return await strapi.entityService.create('api::form-item.form-item', {
    data: {
      ...itemData,
      form: newFormId,
      // If you prefer draft, omit publishedAt
      publishedAt: new Date().toISOString(),
    },
    // Pass transaction
    transacting: trx,
  });
}


module.exports = createCoreController('api::form.form', ({ strapi }) => ({
 async duplicate(ctx) {
    const { id } = ctx.request.body;
    const user = ctx.state.user;

    if (!id) return ctx.badRequest('Missing form ID');
    if (!user) return ctx.unauthorized('User not authenticated');

    // Optional: ensure user can duplicate this form
    // e.g., check ownership here

    try {
      // Populate deeply enough for form_items and their nested fields
      const original = await strapi.entityService.findOne('api::form.form', id, {
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
      const finalSlug = await uniqueSlug(`${slugBase}-copy`);

      // Use a transaction for all creates
      const result = await strapi.db.transaction(async ({ trx }) => {
        const newForm = await strapi.entityService.create('api::form.form', {
          data: {
            ...baseData,
            name: `${original.name} (Copy)`,
            slug: finalSlug,
            active: false,
            cover: coverId || null,
			logo:  logoId || null,
            // If you want to keep it as draft, comment out the next line
            publishedAt: new Date().toISOString(),
          },
          transacting: trx,
        });

        if (Array.isArray(form_items) && form_items.length > 0) {
          for (const item of form_items) {
            await deepDuplicateFormItem(item, newForm.id, trx);
          }
        }

        return newForm;
      });

      return ctx.send({ success: true, data: result }, 201);
    } catch (err) {
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
		const form = await strapi.db.query('api::form.form').findOne({
			where: { id: body.formId, active: true },
			select: ['id', 'name', 'slug', 'override_contact', 'keep_contact', 'webhook_url', 'submit_confirm_text']
		});

		if (!form) {
			return { success: false, message: "Requested form not found or inactive" };
		}

		// 2️⃣ Lookup or create contact
		let contact = null;

		if (form.keep_contact && body.identifier) {
			const whereEmail =  { email: { $eqi: body.identifier } }; // case-insensitive equality
			contact = await strapi.db.query('api::contact.contact').findOne({ where: whereEmail });

			if (!contact) {
				contact = await strapi.db.query('api::contact.contact').create({
					data: {
						email: body.identifier,
						publishedAt: new Date().toISOString()
					}
				});
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
		if (contact && form.override_contact) {
			const contactModel = strapi.contentTypes["api::contact.contact"];
			const contactFields = Object.keys(contactModel.attributes || {});
			const updates = {};

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
					let org = await strapi.db.query('api::organization.organization').findOne({
						where: { name: value }
					});

					if (!org) {
						org = await strapi.db.query('api::organization.organization').create({
							data: {
								name: value,
								publishedAt: new Date().toISOString()
							}
						});
						console.log(`🏢 Created new organization: ${value}`);
					} else {
						console.log(`🏢 Linked existing organization: ${value}`);
					}

					updates.organization = org.id;
				} else {
					updates[match] = value;
				}
			}

			if (Object.keys(updates).length > 0) {
				console.log('🔁 Updating contact with:', updates);
				await strapi.entityService.update('api::contact.contact', contact.id, {
					data: updates,
				});
			}
		}


		// 3️⃣.b Create subscription if "subscribe" field is present and truthy
		const shouldSubscribe = Object.entries(body.formData).some(
			([key, val]) => normalize(key).includes('subscribe') && String(val).toLowerCase() === 'true'
		);

		console.log("Should subscribe?");
		console.log(shouldSubscribe);

		if (contact && shouldSubscribe) {
			try {
				const now = new Date().toISOString();

				// 1️⃣ Look up "Email" channel (case-insensitive)
				const channel = await strapi.db.query('api::channel.channel').findOne({
					where: { name: { $containsi: 'email' } }
				});

				console.log("channel ");
				console.log(channel);

				if (!channel) {
					console.warn(`⚠️ No 'Email' channel found. Skipping subscription.`);
				} else {
					// 2️⃣ Check for existing subscription
					const existing = await strapi.db.query('api::subscription.subscription').findOne({
						where: {
							channel: channel.id,
							contact: contact.id
						}
					});

					if (existing) {
						// Reactivate existing subscription
						await strapi.db.query('api::subscription.subscription').update({
							where: { id: existing.id },
							data: {
								active: true,
								unsubscribed_at: null,
								subscribed_at: now,
								publishedAt: now
							}
						});
						console.log(`🔁 Reactivated subscription for contact ${contact.email}`);
					} else {
						// 3️⃣ Create new subscription
						const data = {
							channel: channel.id,
							contact: contact.id,
							subscribed_at: now,
							active: true,
							publishedAt: now
						};

						await strapi.db.query('api::subscription.subscription').create({ data });

						console.log(`✅ Created subscription for contact ${contact.email}`);
					}
				}
			} catch (err) {
				console.warn(`⚠️ Failed to create subscription:`, err);
			}
		}

		// 4️⃣ Create survey
		const surveyData = {
			form_id: body.formId,
			name: form.name,
			publishedAt: new Date().toISOString()
		};
		if (contact) surveyData.contact = contact.id;

		const survey = await strapi.db.query('api::survey.survey').create({ data: surveyData });

		if (!survey) {
			return { success: false, message: "Failed to create survey" };
		}

		// 5️⃣ Create survey items (with optional file)
		for (const [key, value] of Object.entries(body.formData)) {
			console.log('📝 inserting', key, value);

			const fileKey = `files.${key}`;
			const file = files?.[fileKey];

			const itemData = {
				survey: survey.id,
				question: key,
				answer: typeof value === 'string' ? value : undefined,
				publishedAt: new Date().toISOString()
			};

			if (contact) itemData.contact = contact.id;

			const createOptions = { data: itemData };

			if (file) {
				createOptions.files = {
					file: Array.isArray(file) ? file[0] : file
				};
			}

			await strapi.entityService.create('api::survey-item.survey-item', createOptions);
		}




		// 6️⃣ Log event
		const eventData = {
			action: 'formSubmit',
			external_id: form.id,
			title: form.name,
			source: ip,
			status: 'success',
			payload: JSON.stringify(body),
			publishedAt: new Date().toISOString()
		};
		if (contact) eventData.contact = contact.id;
		if (body.identifier) eventData.destination = body.identifier;

		await strapi.db.query('api::event.event').create({ data: eventData });

		// 7️⃣ Optional webhook
		if (form?.webhook_url) {
			try {
				fetch(form.webhook_url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						identifier: body.identifier || null,
						formId: body.formId,
						surveyId: survey.id,
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
						submissionId: survey.id,
						subject: `${form.name}`,
					});
			} catch (err) {
				console.error("❌ Could not send confirmation email:", err);
			}
		}


		return { success: true, message: "Form successfully submitted" };
	}

}));
