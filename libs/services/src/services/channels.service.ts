import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { Channel, Form_Channel } from "../types/channel";
import BaseService from "./common/base.service";

class ChannelsService extends BaseService<Channel, Form_Channel> {
	public constructor() {
		super(APIRoutesStrapi.CHANNELS);
	}
}

export const channelsService = new ChannelsService();
