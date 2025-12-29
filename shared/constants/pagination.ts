// Re-export from centralized schemas for backward compatibility
// Schemas are now in shared/schemas/pagination-schema.ts
export {
	PAGINATION_LIMITS,
	PAGINATION_DEFAULTS,
	PAGE_SPECIFIC_LIMITS,
	CUID_LENGTH,
	cursorSchema,
	directionSchema,
	type PaginationDirection,
} from "@/shared/schemas/pagination-schema";
