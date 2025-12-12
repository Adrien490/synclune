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

export const PASSWORD_RULES: PasswordRule[] = [
	{
		label: "Au moins 8 caractères",
		test: (password) => password.length >= 8,
	},
	{
		label: "Une lettre majuscule",
		test: (password) => /[A-Z]/.test(password),
	},
	{
		label: "Une lettre minuscule",
		test: (password) => /[a-z]/.test(password),
	},
	{
		label: "Un chiffre",
		test: (password) => /[0-9]/.test(password),
	},
	{
		label: "Un caractère spécial",
		test: (password) => /[^A-Za-z0-9]/.test(password),
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
		case 1:
			return "Très faible";
		case 2:
			return "Faible";
		case 3:
			return "Moyen";
		case 4:
			return "Fort";
		case 5:
			return "Très fort";
		default:
			return "";
	}
}

export function getStrengthColor(level: number): string {
	switch (level) {
		case 0:
		case 1:
			return "bg-destructive";
		case 2:
			return "bg-orange-500";
		case 3:
			return "bg-yellow-500";
		case 4:
			return "bg-green-500";
		case 5:
			return "bg-green-600";
		default:
			return "bg-muted";
	}
}
