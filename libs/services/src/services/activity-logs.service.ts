import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { ActivityLog, Form_ActivityLog } from "../types/activity-log";
import BaseService from "./common/base.service";

class ActivityLogsService extends BaseService<ActivityLog, Form_ActivityLog> {
	public constructor() {
		super(APIRoutesStrapi.ACTIVITY_LOGS);
	}
}

export const activityLogsService = new ActivityLogsService();
