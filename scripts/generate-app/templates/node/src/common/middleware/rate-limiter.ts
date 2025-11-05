import type { Request } from "express";
import { rateLimit } from "express-rate-limit";

import { env } from "@/common/utils/env-config";

const rateLimiter = rateLimit({
	legacyHeaders: true,
	limit: env.NODE_APP_COMMON_RATE_LIMIT_MAX_REQUESTS,
	message: "Too many requests, please try again later.",
	standardHeaders: true,
	keyGenerator: (req: Request) => req.ip as string,
});

export default rateLimiter;
