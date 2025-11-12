import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { Form_Setting, Setting } from "../types/setting";
import BaseService from "./common/base.service";

class SettingsService extends BaseService<Setting, Form_Setting> {
	public constructor() {
		super(APIRoutesStrapi.SETTINGS);
	}
}

export const settingsService = new SettingsService();
