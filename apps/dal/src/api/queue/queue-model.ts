import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const QueueDataQuerySchema = z.object({
	page: z.string().optional().openapi({ example: "1" }),
	jobsPerPage: z.string().optional().openapi({ example: "10" }),
});

export const FailedContactSchema = z.object({
	email: z.string(),
	reason: z.string(),
});

export const FailedOrgSchema = z.object({
	name: z.string(),
	reason: z.string(),
});

export const QueueJobSchema = z.object({
	id: z.string(),
	filename: z.string(),
	createdAt: z.string(),
	type: z.string().nullable().optional(),
	logs: z.array(z.string()),
	failedContacts: z.array(FailedContactSchema),
	failedOrgs: z.array(FailedOrgSchema),
});

export type QueueJob = z.infer<typeof QueueJobSchema>;
