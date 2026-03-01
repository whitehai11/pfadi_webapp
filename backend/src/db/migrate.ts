// engineered by Maro Elias Goth
import { applyMigrations } from "./migrate-runner.js";
import { logger } from "../utils/logger.js";

applyMigrations();
logger.info("Migrations complete");
