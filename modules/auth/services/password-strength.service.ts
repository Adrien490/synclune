// ============================================================================
// TYPES
// ============================================================================

export interface PasswordRule {
	label: string;
	test: (password: string) => boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Règles simplifiées selon Baymard Institute :
 * - 8 caractères minimum
 * - Au moins 2 types de caractères différents
 * Réduit l'abandon de 18% vs 5 critères obligatoires
 */
export const PASSWORD_RULES: PasswordRule[] = [
	{
		label: "Au moins 8 caractères",
		test: (password) => password.length >= 8,
	},
	{
		label: "Au moins 2 types de caractères (lettre, chiffre, symbole)",
		test: (password) => countCharacterTypes(password) >= 2,
	},
];

/**
 * Compte le nombre de types de caractères différents dans le mot de passe
 * Types : majuscule, minuscule, chiffre, caractère spécial
 */
export function countCharacterTypes(password: string): number {
	let count = 0;
	if (/[A-Z]/.test(password)) count++;
	if (/[a-z]/.test(password)) count++;
	if (/[0-9]/.test(password)) count++;
	if (/[^A-Za-z0-9]/.test(password)) count++;
	return count;
}

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
			return "Très faible";
		case 1:
			return "Faible";
		case 2:
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
			return "bg-green-600";
		default:
			return "bg-muted";
	}
}
