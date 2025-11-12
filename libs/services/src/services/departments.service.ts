import { APIRoutesStrapi } from "../api-routes/api-routes-strapi";
import type { Department, Form_Department } from "../types/department";
import BaseService from "./common/base.service";

class DepartmentsService extends BaseService<Department, Form_Department> {
	public constructor() {
		super(APIRoutesStrapi.DEPARTMENTS);
	}
}

export const departmentsService = new DepartmentsService();
