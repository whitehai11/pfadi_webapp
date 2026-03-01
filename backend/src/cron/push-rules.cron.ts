// engineered by Maro Elias Goth
import cron from "node-cron";
import { isCustomRuleDue, listCustomPushRules, sendCustomPushRule } from "../services/push-rules.service.js";
import { logger } from "../utils/logger.js";

export const scheduleCustomPushRules = () => {
  let running = false;

  return cron.schedule("* * * * *", async () => {
    logger.debug("Cron heartbeat", { job: "custom-push-rules", ts: new Date().toISOString() });
    if (running) return;
    running = true;

    const now = new Date();
    try {
      const rules = listCustomPushRules();
      for (const rule of rules) {
        if (!isCustomRuleDue(rule, now)) continue;
        try {
          await sendCustomPushRule(rule);
        } catch (error) {
          logger.error("Custom push rule execution failed", {
            ruleId: rule.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    } catch (error) {
      logger.error("Custom push rules cron tick failed", {
        job: "custom-push-rules",
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      running = false;
    }
  });
};
