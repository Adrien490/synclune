import { CustomizationRequestStatus } from "@/app/generated/prisma/client";

// ============================================================================
// CUSTOMIZATION STATUS TRANSITION SERVICE
// Pure functions for validating customization status transitions
// ============================================================================

/**
 * Allowed transitions for customization request statuses.
 * Defines which statuses can transition to which other statuses.
 */
const ALLOWED_TRANSITIONS: Record<
	CustomizationRequestStatus,
	CustomizationRequestStatus[]
> = {
	PENDING: [
		CustomizationRequestStatus.IN_PROGRESS,
		CustomizationRequestStatus.COMPLETED,
		CustomizationRequestStatus.CANCELLED,
	],
	IN_PROGRESS: [
		CustomizationRequestStatus.COMPLETED,
		CustomizationRequestStatus.CANCELLED,
	],
	COMPLETED: [],
	CANCELLED: [],
};

/**
 * Checks if a status transition is allowed
 */
export function canTransitionTo(
	currentStatus: CustomizationRequestStatus,
	targetStatus: CustomizationRequestStatus
): boolean {
	if (currentStatus === targetStatus) return false;
	return ALLOWED_TRANSITIONS[currentStatus].includes(targetStatus);
}

/**
 * Returns the list of valid target statuses from a given status
 */
export function getAvailableTransitions(
	currentStatus: CustomizationRequestStatus
): CustomizationRequestStatus[] {
	return ALLOWED_TRANSITIONS[currentStatus];
}

/**
 * Checks if a status is a final state (no further transitions possible)
 */
export function isFinalStatus(
	status: CustomizationRequestStatus
): boolean {
	return ALLOWED_TRANSITIONS[status].length === 0;
}
