import { env } from "@/common/utils/env-config";

const STRAPI_HEALTH_ENDPOINT = env.STRAPI_URL.replace(/\/?api\/?$/, "");

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const waitForStrapi = async (): Promise<void> => {
	const maxAttemptsPerRound = 15;
	const delayBetweenAttempts = 10000;
	const delayBetweenRounds = 60000;

	for (let round = 1; round <= 2; round++) {
		for (let attempt = 1; attempt <= maxAttemptsPerRound; attempt++) {
			try {
				const response = await fetch(STRAPI_HEALTH_ENDPOINT);
				if (response.ok) {
					console.log(" Strapi is up and running!");
					return;
				}
			} catch (_err) {
				// fetch throws only on network errors
			}

			console.log(
				` Waiting for Strapi at ${STRAPI_HEALTH_ENDPOINT}... (Attempt ${attempt}/${maxAttemptsPerRound}, Round ${round}/2)`,
			);
			await sleep(delayBetweenAttempts);
		}

		if (round < 2) {
			console.log(" Waiting 1 minute before retrying...");
			await sleep(delayBetweenRounds);
		}
	}

	throw new Error(
		" Strapi did not become available in time after two rounds of retries.",
	);
};
