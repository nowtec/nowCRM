import cron from "node-cron";
import { CRON_EXPRESSION } from "../../config";
import { scheduleJourneys } from "../../jobs/schedule-journeys";

export function startJourneyScheduler() {
	cron.schedule(CRON_EXPRESSION, scheduleJourneys);
}
