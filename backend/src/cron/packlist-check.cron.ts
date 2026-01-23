import cron from "node-cron";
import { db } from "../db/database.js";
import { sendToUser } from "../services/push.service.js";

export const schedulePacklistChecks = () => {
  cron.schedule("30 7 * * *", async () => {
    const now = new Date();
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const events = db
      .prepare(
        "SELECT id, title, start_at FROM events WHERE packlist_required = 1 AND start_at BETWEEN ? AND ?"
      )
      .all(now.toISOString(), inSevenDays.toISOString()) as { id: string; title: string; start_at: string }[];

    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all() as { id: string }[];

    for (const event of events) {
      const packlist = db.prepare("SELECT id FROM packlists WHERE event_id = ?").get(event.id) as
        | { id: string }
        | undefined;
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
  });
};
