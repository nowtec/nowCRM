import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const MassDeleteSchema = z.object({
	entity: z.string(),
	searchMask: z.record(z.any()),
	mass_action: z.string(),
});

export const MassUpdateSchema = z.object({
	entity: z.string(),
	searchMask: z.record(z.any()),
	mass_action: z.string(),
	update_data: z.string(),
	userEmail: z.string().optional(),
});

export const MassUpdateSubscriptionSchema = z.object({
	entity: z.string(),
	searchMask: z.record(z.any()),
	mass_action: z.string(),
	isSubscribe: z.boolean(),
	channelId: z.number(),
});

export const MassAddToListSchema = z.object({
	entity: z
		.string()
		.openapi({ description: "Strapi entity name (e.g. 'contacts')" }),
	searchMask: z
		.record(z.any())
		.openapi({ description: "Search filters to apply" }),
	listField: z.string().openapi({
		description: "Field name to assign list ID to (e.g. 'listId')",
	}),
	listId: z
		.number()
		.openapi({ description: "ID of the list to assign items to" }),
});

export const MassAddToOrganizationSchema = z.object({
	entity: z
		.string()
		.openapi({ description: "Strapi entity name (e.g. 'contacts')" }),
	searchMask: z
		.record(z.any())
		.openapi({ description: "Search filters to apply" }),
	listField: z.string().openapi({
		description: "Field name to assign list ID to (e.g. 'listId')",
	}),
	organization_id: z
		.number()
		.openapi({ description: "ID of the list to assign items to" }),
});

export const MassAddToJourneySchema = z.object({
	entity: z
		.string()
		.openapi({ description: "Strapi entity name (e.g. 'contacts')" }),
	searchMask: z
		.record(z.any())
		.openapi({ description: "Search filters to apply" }),
	listField: z.string().openapi({
		description: "Field name to assign list ID to (e.g. 'listId')",
	}),
	listId: z
		.number()
		.openapi({ description: "ID of the list to assign items to" }),
});

export const MassExportSchema = z.object({
	entity: z
		.string()
		.openapi({ description: "Strapi entity name (e.g. 'contacts')" }),
	searchMask: z
		.record(z.any())
		.openapi({ description: "Search filters to apply" }),
	listField: z.string().openapi({
		description: "Field name to assign list ID to (e.g. 'listId')",
	}),
	listId: z
		.number()
		.openapi({ description: "ID of the list to assign items to" }),
});

export const MassAnonymizeSchema = z.object({
	entity: z
		.string()
		.openapi({ description: "Strapi entity name (e.g. 'contacts')" }),
	searchMask: z
		.record(z.any())
		.openapi({ description: "Search filters to apply" }),
	listField: z.string().openapi({
		description: "Field name to assign list ID to (e.g. 'listId')",
	}),
	listId: z
		.number()
		.openapi({ description: "ID of the list to assign items to" }),
});

export type MassDeletePayload = z.infer<typeof MassDeleteSchema>;
export type MassUpdatePayload = z.infer<typeof MassUpdateSchema>;
export type MassUpdateSubscriptionPayload = z.infer<
	typeof MassUpdateSubscriptionSchema
>;
export type MassAddToOrganizationPayload = z.infer<typeof MassAddToListSchema>;
export type MassAddToJourneyPayload = z.infer<typeof MassAddToListSchema>;
export type MassAnonymizePayload = z.infer<typeof MassAddToListSchema>;
export type MassExportPayload = z.infer<typeof MassAddToListSchema>;
export type MassAddToListPayload = z.infer<typeof MassAddToListSchema>;
