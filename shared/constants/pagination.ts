// Re-export from centralized schemas for backward compatibility
// Schemas are now in shared/schemas/pagination-schema.ts
export {
	PAGINATION_LIMITS,
	PAGINATION_DEFAULTS,
	CUID_LENGTH,
	cursorSchema,
	directionSchema,
} from "@/shared/schemas/pagination-schema";
