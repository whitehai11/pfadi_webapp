// engineered by Maro Elias Goth
import cron from "node-cron";
import { db } from "../db/database.js";
import { sendToUser } from "../services/push.service.js";
import { logger } from "../utils/logger.js";
export const schedulePacklistChecks = () => {
    return cron.schedule("30 7 * * *", async () => {
        logger.debug("Cron heartbeat", { job: "packlist-check", ts: new Date().toISOString() });
        try {
            const now = new Date();
            const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const events = db
                .prepare("SELECT id, title, start_at FROM events WHERE packlist_required = 1 AND start_at BETWEEN ? AND ?")
                .all(now.toISOString(), inSevenDays.toISOString());
            const admins = db
                .prepare("SELECT id FROM users WHERE role = 'admin' AND status = 'approved'")
                .all();
            for (const event of events) {
                const packlist = db.prepare("SELECT id FROM packlists WHERE event_id = ?").get(event.id);
                if (!packlist) {
                    for (const admin of admins) {
                        await sendToUser(admin.id, {
                            title: "Fehlende Packliste",
                            body: `${event.title} (${new Date(event.start_at).toLocaleString("de-DE")}) hat keine Packliste.`,
                            eventId: event.id,
                            type: "packlist-missing"
                        });
                    }
                }
            }
        }
        catch (error) {
            logger.error("Packlist check cron job failed", {
                job: "packlist-check",
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
};
