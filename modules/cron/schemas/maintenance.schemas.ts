import { z } from "zod";
import { MAINTENANCE_TASK_IDS } from "../constants/maintenance-tasks";

export const runMaintenanceTaskSchema = z.object({
	task: z.enum(MAINTENANCE_TASK_IDS),
});
