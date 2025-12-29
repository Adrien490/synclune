import type { PasswordRule } from "@/shared/types/utility.types"

export type { PasswordRule } from "@/shared/types/utility.types"

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Règle simplifiée selon Baymard Institute (6-8 chars suffisent)
 */
export const PASSWORD_RULES: PasswordRule[] = [
	{
		label: "Au moins 6 caractères",
		test: (password) => password.length >= 6,
	},
];

// ============================================================================
// FUNCTIONS
// ============================================================================

export function getStrengthLevel(password: string): number {
	if (!password) return 0;
	return PASSWORD_RULES.filter((rule) => rule.test(password)).length;
}

export function getStrengthLabel(level: number): string {
	switch (level) {
		case 0:
			return "Trop court";
		case 1:
			return "Valide";
		default:
			return "";
	}
}

export function getStrengthColor(level: number): string {
	switch (level) {
		case 0:
			return "bg-destructive";
		case 1:
			return "bg-green-600";
		default:
			return "bg-muted";
	}
}
