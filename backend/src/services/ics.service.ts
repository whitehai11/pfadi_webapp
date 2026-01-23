import fs from "node:fs";
import path from "node:path";
import ical, { ICalCalendarMethod } from "ical-generator";
import { settings } from "../config/settings.js";
import { listEvents } from "./calendar.service.js";

const ensureDataDir = () => {
  if (!fs.existsSync(settings.dataDir)) {
    fs.mkdirSync(settings.dataDir, { recursive: true });
  }
};

export const getIcsPath = () => path.join(settings.dataDir, "calendar.ics");

export const generateIcs = () => {
  const calendar = ical({
    name: "Pfadfinder Kalender",
    prodId: "-//pfadi-orga//calendar//DE",
    method: ICalCalendarMethod.PUBLISH
  });

  const events = listEvents();
  for (const event of events) {
    const category = event.type?.trim();
    calendar.createEvent({
      id: event.id,
      start: new Date(event.start_at),
      end: new Date(event.end_at),
      summary: event.title,
      description: event.description,
      location: event.location,
      categories: category ? [{ name: category }] : undefined,
      lastModified: new Date(event.updated_at)
    });
  }

  ensureDataDir();
  fs.writeFileSync(getIcsPath(), calendar.toString(), "utf8");
};
