// engineered by Maro Elias Goth
import cron from "node-cron";
import { generateIcs } from "../services/ics.service.js";
import { logger } from "../utils/logger.js";
import { markJobFinish, markJobStart } from "../services/admin-monitor.service.js";

export const runCalendarRefreshJob = async () => {
  markJobStart("calendar-refresh");
  try {
    logger.debug("Running calendar refresh job");
    generateIcs();
    markJobFinish("calendar-refresh");
  } catch (error) {
    markJobFinish("calendar-refresh", error);
    throw error;
  }
};

export const scheduleCalendarRefresh = () => {
  return cron.schedule("*/15 * * * *", async () => {
    logger.debug("Cron heartbeat", { job: "calendar-refresh", ts: new Date().toISOString() });
    try {
      await runCalendarRefreshJob();
    } catch (error) {
      logger.error("Calendar refresh job failed", {
        job: "calendar-refresh",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
};
