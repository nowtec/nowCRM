import pg from "pg";
import { env } from "@/common/utils/env-config";

const { Pool } = pg;

const config: any = {
	host: env.DAL_DATABASE_HOST,
	port: env.DAL_DATABASE_PORT,
	user: env.DAL_DATABASE_USERNAME,
	password: env.DAL_DATABASE_PASSWORD,
	database: env.DAL_DATABASE_NAME,
};

if (env.DAL_DATABASE_RDS) {
	config.ssl = {
		rejectUnauthorized: env.DAL_DATABASE_SSL_SELF,
	};
}

export const pool = new Pool(config);
