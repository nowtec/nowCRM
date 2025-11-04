
import { z } from "zod";

export const ServiceResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
	z.object({
		success: z.boolean(),
		message: z.string(),
		responseObject: dataSchema.optional(),
		statusCode: z.number(),
	});