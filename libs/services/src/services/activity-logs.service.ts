import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type { ActivityLog, Form_ActivityLog } from "../types/activity-log";
import BaseService from "./common/base.service";

class ActivityLogsService extends BaseService<ActivityLog, Form_ActivityLog> {
	public constructor() {
		super(API_ROUTES_STRAPI.ACTIVITY_LOGS);
	}
}

export const activityLogsService = new ActivityLogsService();
