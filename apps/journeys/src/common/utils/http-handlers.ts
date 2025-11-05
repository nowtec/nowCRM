import type { ServiceResponse } from "@nowcrm/services";
import type { Response } from "express";

export const handleServiceResponse = (
	serviceResponse: ServiceResponse<any>,
	response: Response,
) => {
	return response.status(serviceResponse.statusCode).send(serviceResponse);
};
