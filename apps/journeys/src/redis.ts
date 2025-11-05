import Redis from "ioredis";
import { env } from "./common/utils/env-config";

export const redis = new Redis({
	port: env.JOURNEYS_REDIS_PORT,
	host: env.JOURNEYS_REDIS_HOST,
	maxRetriesPerRequest: null,
});
