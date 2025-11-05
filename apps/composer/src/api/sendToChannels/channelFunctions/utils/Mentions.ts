import type { StrapiQuery, TextBlock } from "@nowcrm/services";
import { textblocksService } from "@nowcrm/services/server";
import { env } from "@/common/utils/envConfig";

interface MentionCheckResult {
	mentions: string[];
}

export async function checkMentions(
	text: string | undefined,
): Promise<MentionCheckResult> {
	if (!text) {
		return { mentions: [] };
	}

	const allowedMentions = [
		"@contact.id",
		"@contact.email",
		"@contact.name",
		"@contact.first_name",
		"@contact.last_name",
		"@contact.address_line1",
		"@contact.address_line2",
		"@contact.plz",
		"@contact.location",
		"@contact.canton",
		"@contact.language",
		"@contact.function",
		"@contact.phone",
		"@contact.mobile_phone",
		"@contact.salutation",
		"@contact.gender",
		"@contact.birth_date",
		"@contact.organization",
		"@contact.department",
		"@contact.publications",
		"@contact.keywords",
		"@contact.contact_channels",
		"@contact.contact_interests",
		"@contact.extra_fields",
		"@contact.createdAt",
		"@contact.updatedAt",
		"@contact.document",
	];

	const mentions = text.match(/\B@[\w.]+/g) || [];
	const normalizedMentions = mentions.map((mention) =>
		mention.replace(/\.$/, ""),
	);
	const validMentions = normalizedMentions.filter((mention) =>
		allowedMentions.includes(mention),
	);

	const mention_fields: string[] = [];
	let _mentionEntity = "";

	for (const mention of validMentions) {
		const parts = mention.split(".");
		if (parts.length > 1 && parts[0] === "@contact") {
			mention_fields.push(parts[1]);
		}
	}

	if (mention_fields.length > 0 && validMentions.length > 0) {
		_mentionEntity = "contacts";
	}

	return { mentions: validMentions };
}

export async function findTextBlock(
	query: StrapiQuery<TextBlock>,
): Promise<string> {
	try {
		const textBlocks = await textblocksService.find(
			env.COMPOSER_STRAPI_API_TOKEN,
			query,
		);
		return textBlocks.data ? textBlocks.data[0].text : "";
	} catch (error) {
		console.error("Error getting textblock:", error);
		return "";
	}
}

// Make the function async so we can await getTextBlock
export async function replaceMentionsInText(
	text: string,
	contact: any,
	mentions: string[],
): Promise<string> {
	let updatedText = text;

	// 1) Find all unique text_block.<name> placeholders
	//    where <name> may contain letters, digits, spaces or hyphens.
	const blockRegex = /@text_block\.([\w\s-]+)/g;

	const rawNames = new Set<string>();
	let match = blockRegex.exec(text);
	while (match !== null) {
		rawNames.add(match[1]);
		match = blockRegex.exec(text);
	}

	const blockFetches: Record<string, string> = {};
	await Promise.all(
		[...rawNames].map(async (rawName) => {
			const normalized = rawName.replace(/-/g, " ");
			try {
				blockFetches[rawName] = await findTextBlock({
					filters: {
						name: { $eq: normalized },
					},
				});
			} catch {
				blockFetches[rawName] = "";
			}
		}),
	);

	for (const rawName of rawNames) {
		const placeholder = `@text_block.${rawName}`;
		const content = blockFetches[rawName];
		updatedText = updatedText.replaceAll(placeholder, content);
	}

	for (const mention of mentions) {
		if (mention.startsWith("@text_block.")) continue;

		const [, field, filename] = mention.split(".");
		let replace_string = "";

		if (field in contact && contact[field]) {
			replace_string = contact[field];
		} else if (field === "document") {
			if (contact.documents) {
				const doc = contact.documents.find((el: any) => el.name === filename);
				replace_string = doc ? doc.url : "";
			}
		} else if (field === "organization") {
			const org = contact.organization;
			replace_string = org ? org.name : "";
		}

		updatedText = updatedText.replaceAll(mention, replace_string);
	}

	return updatedText;
}
