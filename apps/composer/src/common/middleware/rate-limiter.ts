import { createHash } from "node:crypto";
import type { Request } from "express";
import { rateLimit } from "express-rate-limit";

import { env } from "@/common/utils/env-config";

// Infrastructure traffic (gateway probes, SES/SNS deliveries, queue dashboard
// polling) must not consume the quota reserved for user-driven sends.
const UNLIMITED_PATH_PREFIXES = [
	"/health-check",
	"/webhook",
	"/admin/queues",
] as const;

/**
 * Builds the bucket a request is counted against.
 *
 * Requests reach this service through KrakenD, so the socket address is the
 * gateway for every caller and cannot separate them. The bearer token is the
 * only per-user signal available before authentication, and it is hashed so it
 * never reaches logs or the in-memory store.
 *
 * @param req - The incoming request.
 * @returns A per-caller key, falling back to the client IP when anonymous.
 */
const keyGenerator = (req: Request): string => {
	const authorization = req.get("authorization");
	if (authorization) {
		return `token:${createHash("sha256").update(authorization).digest("hex")}`;
	}

	return `ip:${req.ip}`;
};

const rateLimiter = rateLimit({
	legacyHeaders: true,
	limit: env.COMPOSER_COMMON_RATE_LIMIT_MAX_REQUESTS,
	message: "Too many requests, please try again later.",
	standardHeaders: true,
	windowMs: env.COMPOSER_COMMON_RATE_LIMIT_WINDOW_MS,
	keyGenerator,
	skip: (req: Request) =>
		UNLIMITED_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix)),
});

export default rateLimiter;
