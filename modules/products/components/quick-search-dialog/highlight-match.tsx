/**
 * Highlights matching substrings in text by wrapping them in <mark>.
 * Case-insensitive, escapes regex special characters.
 * Uses index-based alternation: odd indices from split(/(pattern)/) are matches.
 */
export function HighlightMatch({ text, query }: { text: string; query: string }) {
	if (!query.trim()) {
		return <>{text}</>
	}

	const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	const regex = new RegExp(`(${escaped})`, "gi")
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
