import { APIRoutesDAL } from "@nowcrm/services";
import express from "express";
import Redis from "ioredis";
import { env } from "@/common/utils/env-config";

const redis = new Redis({ host: env.DAL_REDIS_HOST, port: env.DAL_REDIS_PORT });
const router = express.Router();

router.get(`/${APIRoutesDAL.PROGRESS}`, async (_req, res) => {
	try {
		const keys = await redis.keys("progress:*:total");

		const results = [];

		for (const key of keys) {
			const jobId = key.split(":")[1];

			const [totalStr, completedStr] = await redis.mget(
				`progress:${jobId}:total`,
				`progress:${jobId}:completed`,
			);

			const total = Number.parseInt(totalStr || "0", 10);
			const completed = Number.parseInt(completedStr || "0", 10);
			const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

			results.push({ jobId, progressPercent: percent });
		}
		res.json({ progress: results });
	} catch (err) {
		console.error("Failed to fetch progress", err);
		res.status(500).json({ error: "Could not fetch progress data" });
	}
});

export default router;
