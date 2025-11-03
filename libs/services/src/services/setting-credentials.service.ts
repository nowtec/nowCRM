import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type {
	Form_SettingCredential,
	SettingCredential,
} from "../types/setting-credential";
import BaseService from "./common/base.service";

class SettingCredentialsService extends BaseService<
	SettingCredential,
	Form_SettingCredential
> {
	public constructor() {
		super(API_ROUTES_STRAPI.SETTING_CREDENTIALS);
	}
}

export const settingCredentialsService = new SettingCredentialsService();
