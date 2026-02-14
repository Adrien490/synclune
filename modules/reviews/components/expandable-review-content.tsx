interface ExpandableReviewContentProps {
	content: string;
	clampLines?: 3 | 5;
}

const EXPANDABLE_THRESHOLD = 250;

export function ExpandableReviewContent({ content, clampLines = 5 }: ExpandableReviewContentProps) {
	if (content.length < EXPANDABLE_THRESHOLD) {
		return (
			<p itemProp="reviewBody" className="text-sm text-muted-foreground leading-relaxed">
				{content}
			</p>
		);
	}

	return (
		<details className="group">
			<summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-sm">
				<span itemProp="reviewBody" className={`text-sm text-muted-foreground leading-relaxed group-open:line-clamp-none ${clampLines === 3 ? "line-clamp-3" : "line-clamp-5"}`}>
					{content}
				</span>
				<span className="mt-1 block text-xs font-medium text-primary hover:text-primary/80 motion-safe:transition-colors group-open:hidden">
					Lire la suite
				</span>
				<span className="mt-1 hidden text-xs font-medium text-primary hover:text-primary/80 motion-safe:transition-colors group-open:block">
					Voir moins
				</span>
			</summary>
		</details>
	);
}
