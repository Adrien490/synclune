/**
 * Highlights matching substrings in text by wrapping them in <mark>.
 * Case-insensitive, escapes regex special characters.
 * Uses index-based alternation: odd indices from split(/(pattern)/) are matches.
 *
 * Accepts optional synonyms to highlight terms that matched via synonym expansion
 * (e.g. searching "anneau" highlights "Bague" in "Bague Lune").
 */
export function HighlightMatch({
	text,
	query,
	synonyms,
}: {
	text: string
	query: string
	synonyms?: string[]
}) {
	const allTerms = [query, ...(synonyms ?? [])]
		.map((t) => t.trim())
		.filter(Boolean)

	if (allTerms.length === 0) {
		return <>{text}</>
	}

	const escaped = allTerms.map((t) =>
		t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	)
	const regex = new RegExp(`(${escaped.join("|")})`, "gi")
	const parts = text.split(regex)

	return (
		<>
			{parts.map((part, i) =>
				i % 2 === 1 ? (
					<mark
						key={i}
						className="bg-primary/15 text-foreground font-medium rounded-sm"
					>
						{part}
					</mark>
				) : (
					<span key={i}>{part}</span>
				)
			)}
		</>
	)
}
