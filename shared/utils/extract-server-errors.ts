import { ActionStatus, type ActionState } from "@/shared/types/server-action";

/**
 * Extracts error messages from an ActionState for display alongside TanStack Form errors.
 * mergeForm (react-form-nextjs) does not parse our custom ActionState shape, so forms
 * rely on this fallback to surface server-side errors in aria-live regions.
 *
 * Returns [] for SUCCESS, WARNING, INITIAL, or undefined state.
 */
export const extractServerErrors = (state: ActionState | undefined): string[] => {
	if (!state || typeof state !== "object" || !("status" in state)) return [];
	if (state.status === ActionStatus.SUCCESS) return [];
	if (state.status === ActionStatus.WARNING) return [];
	if (state.status === ActionStatus.INITIAL) return [];
	if (typeof state.message !== "string" || !state.message) return [];
	return [state.message];
};
