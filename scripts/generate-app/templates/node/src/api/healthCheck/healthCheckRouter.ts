import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { ServiceResponse } from "@nowcrm/services";
import { handleServiceResponse } from "@/common/utils/http-handlers";

export const healthCheckRegistry = new OpenAPIRegistry();
export const healthCheckRouter: Router = express.Router();

healthCheckRouter.get("/", (_req: Request, res: Response) => {
	const serviceResponse = ServiceResponse.success("Service is healthy", null);
	return handleServiceResponse(serviceResponse, res);
});
