// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { LanguageKeys, TextBlock } from "@nowcrm/services";
import { handleError, StandardResponse, textblocksService } from "@nowcrm/services/server";

export async function getLocalizedTextBlock(
	name: string,
): Promise<StandardResponse<{ locale: string; data: TextBlock }[]>> {
	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}
	const locales: LanguageKeys[] = ["en", "de", "it", "fr"];
	try {
		const fetchPromises = locales.map(async (loc) => {
			const response = await textblocksService.find(session.jwt, {
				filters: { name: { $eq: name } },
				locale: loc,
			});
			if (!response.data || !(response.data.length > 0)) {
				const item = await textblocksService.create({
					name,
					publishedAt: new Date(),
					text: "",
					locale: loc,
				}, session.jwt);
				return { locale: loc, data: item.data as TextBlock };
			}
			return { locale: loc, data: response.data[0] };
		});

		const results = await Promise.all(fetchPromises);

		return {
			data: results,
			status: 200,
			success: true,
		};
	} catch (error) {
		return handleError(error);
	}
}
