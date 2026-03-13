const LINK_PLACEHOLDER_REGEX = /\{\{link(\d+)\}\}/g;

/**
 * Validate that all {{linkN}} placeholders in the answer have matching entries
 * in the links array. Returns an error message if validation fails, or null if valid.
 */
export function validateFaqLinksConsistency(
	answer: string,
	links: { text: string; href: string }[] | null | undefined,
): string | null {
	const matches = [...answer.matchAll(LINK_PLACEHOLDER_REGEX)];

	if (matches.length === 0) return null;

	if (!links || links.length === 0) {
		return "La réponse contient des placeholders de liens mais aucun lien n'est défini";
	}

	for (const match of matches) {
		const idx = Number.parseInt(match[1]!, 10);
		if (!links[idx]) {
			return `Le placeholder {{link${idx}}} n'a pas de lien correspondant`;
		}
	}

	return null;
}
