/**
 * Helper pour normaliser une chaîne en slug (URL-safe)
 * @example "Or rose" → "or-rose", "Argent 925" → "argent-925"
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "") // Remove accents
		.replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with -
		.replace(/^-+|-+$/g, ""); // Trim leading/trailing -
}
