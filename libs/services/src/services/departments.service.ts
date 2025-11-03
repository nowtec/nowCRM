import API_ROUTES_STRAPI from "../api-routes/api-routes-strapi";
import type { Department, Form_Department } from "../types/department";
import BaseService from "./common/base.service";

class DepartmentsService extends BaseService<Department, Form_Department> {
	public constructor() {
		super(API_ROUTES_STRAPI.DEPARTMENTS);
	}
}

export const departmentsService = new DepartmentsService();
