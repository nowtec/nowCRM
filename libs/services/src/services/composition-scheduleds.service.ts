import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type {
	CompositionScheduled,
	Form_CompositionScheduled,
} from "../types/composition-scheduled";
import BaseService from "./common/base.service";

class CompositionScheduledsService extends BaseService<
	CompositionScheduled,
	Form_CompositionScheduled
> {
	public constructor() {
		super(API_ROUTES_STRAPI.COMPOSITION_SCHEDULEDS);
	}
}

export const compositionScheduledsService = new CompositionScheduledsService();
