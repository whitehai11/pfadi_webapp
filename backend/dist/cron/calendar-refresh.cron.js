// engineered by Maro Elias Goth
import cron from "node-cron";
import { generateIcs } from "../services/ics.service.js";
import { logger } from "../utils/logger.js";
export const scheduleCalendarRefresh = () => {
    return cron.schedule("*/15 * * * *", async () => {
        logger.debug("Cron heartbeat", { job: "calendar-refresh", ts: new Date().toISOString() });
        try {
            logger.debug("Running calendar refresh job");
            generateIcs();
        }
        catch (error) {
            logger.error("Calendar refresh job failed", {
                job: "calendar-refresh",
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
};
