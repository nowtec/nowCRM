import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { Form_MediaType, MediaType } from "../types/media-type";
import BaseService from "./common/base.service";

class MediaTypesService extends BaseService<MediaType, Form_MediaType> {
	public constructor() {
		super(APIRoutesStrapi.MEDIA_TYPES);
	}
}

export const mediaTypesService = new MediaTypesService();
