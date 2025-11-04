import type { Response } from "express";
import { ServiceResponse } from "@nowcrm/services";

export const handleServiceResponse = (
	serviceResponse: ServiceResponse<any>,
	response: Response,
) => {
	return response.status(serviceResponse.statusCode).send(serviceResponse);
};
