import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { Event, Form_Event } from "../types/event";
import BaseService from "./common/base.service";

class EventsService extends BaseService<Event, Form_Event> {
	public constructor() {
		super(APIRoutesStrapi.EVENTS);
	}
}

export const eventsService = new EventsService();
