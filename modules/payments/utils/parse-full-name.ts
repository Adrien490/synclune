/**
 * Parse un nom complet en prénom et nom
 * Baymard recommande un champ unique "Full Name" pour réduire les champs du formulaire
 * La logique: tout avant le dernier espace = prénom, le reste = nom
 */
export function parseFullName(fullName: string): { firstName: string; lastName: string } {
	const trimmed = fullName.trim();
	const lastSpaceIndex = trimmed.lastIndexOf(" ");

	if (lastSpaceIndex === -1) {
		// Pas d'espace: tout est le prénom
		return { firstName: trimmed, lastName: "" };
	}

	return {
		firstName: trimmed.substring(0, lastSpaceIndex).trim(),
		lastName: trimmed.substring(lastSpaceIndex + 1).trim(),
	};
}
