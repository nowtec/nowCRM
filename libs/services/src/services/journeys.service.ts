import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import { envServices } from "../envConfig";
import type { Form_Journey, Journey } from "../types/journey";
import BaseService from "./common/base.service";
import {
	handleError,
	handleResponse,
	type StandardResponse,
} from "./common/response.service";

class JourneysService extends BaseService<Journey, Form_Journey> {
	public constructor() {
		super(APIRoutesStrapi.JOURNEYS);
	}

	async duplicate(
		journeyId: number,
		token: string,
	): Promise<StandardResponse<null>> {
		try {
			const url = `${envServices.STRAPI_URL}${APIRoutesStrapi.JOURNEY_DUPLICATE}`;

			const response = await fetch(url, {
				method: "POST",
				headers: this.getHeaders(true, token),
				body: JSON.stringify({ id: journeyId }),
			});

			return await handleResponse(response);
		} catch (error: any) {
			return handleError(error);
		}
	}
}

export const journeysService = new JourneysService();
