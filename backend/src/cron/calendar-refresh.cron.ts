import cron from "node-cron";
import { generateIcs } from "../services/ics.service.js";

export const scheduleCalendarRefresh = () => {
  cron.schedule("0 * * * *", () => {
    console.log("Running hourly calendar refresh");
    generateIcs();
  });
};
