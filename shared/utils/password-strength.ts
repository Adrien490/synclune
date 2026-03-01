import type { PasswordRule } from "@/shared/types/utility.types";

export type { PasswordRule } from "@/shared/types/utility.types";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Password rules aligned with OWASP recommendations (12 chars minimum).
 * Progressive feedback helps users create strong passwords.
 */
export const PASSWORD_RULES: PasswordRule[] = [
	{
		label: "Au moins 12 caractères",
		test: (password) => password.length >= 12,
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
			return "bg-orange-500";
		case 2:
			return "bg-yellow-500";
		case 3:
			return "bg-green-600";
		default:
			return "bg-muted";
	}
}
