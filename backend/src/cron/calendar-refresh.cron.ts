import cron from "node-cron";
import { generateIcs } from "../services/ics.service.js";

export const scheduleCalendarRefresh = () => {
  cron.schedule("*/15 * * * *", () => {
    console.log("Running 15-minute calendar refresh");
    generateIcs();
  });
};
