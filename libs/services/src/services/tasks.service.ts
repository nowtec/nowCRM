import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { Form_Task, Task } from "../types/task";
import BaseService from "./common/base.service";

class TasksService extends BaseService<Task, Form_Task> {
	public constructor() {
		super(APIRoutesStrapi.TASKS);
	}
}

export const tasksService = new TasksService();
