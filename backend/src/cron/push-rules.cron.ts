import cron from "node-cron";
import { isCustomRuleDue, listCustomPushRules, sendCustomPushRule } from "../services/push-rules.service.js";

export const scheduleCustomPushRules = () => {
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const rules = listCustomPushRules();

    for (const rule of rules) {
      if (!isCustomRuleDue(rule, now)) continue;
      await sendCustomPushRule(rule);
    }
  });
};
