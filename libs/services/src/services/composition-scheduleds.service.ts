import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
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
		super(APIRoutesStrapi.COMPOSITION_SCHEDULEDS);
	}
}

export const compositionScheduledsService = new CompositionScheduledsService();
