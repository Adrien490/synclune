import type { PasswordRule } from "@/shared/types/utility.types";

export type { PasswordRule } from "@/shared/types/utility.types";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Password rules for progressive strength feedback.
 */
export const PASSWORD_RULES: PasswordRule[] = [
	{
		label: "Au moins 8 caractères",
		test: (password) => password.length >= 8,
	},
	{
		label: "Contient une majuscule et une minuscule",
		test: (password) => /[a-z]/.test(password) && /[A-Z]/.test(password),
	},
	{
		label: "Contient un chiffre ou caractère spécial",
		test: (password) => /[\d\W]/.test(password),
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
			return "Faible";
		case 2:
			return "Moyen";
		case 3:
			return "Fort";
		default:
			return "";
	}
}

export function getStrengthColor(level: number): string {
	switch (level) {
		case 0:
			return "bg-destructive";
		case 1:
			return "bg-destructive/70";
		case 2:
			return "bg-warning";
		case 3:
			return "bg-success";
		default:
			return "bg-muted";
	}
}
