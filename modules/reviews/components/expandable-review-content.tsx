import { cn } from "@/shared/utils/cn";

interface ExpandableReviewContentProps {
	content: string;
	clampLines?: 3 | 5;
}

const EXPANDABLE_THRESHOLD = 250;

export function ExpandableReviewContent({ content, clampLines = 5 }: ExpandableReviewContentProps) {
	if (content.length < EXPANDABLE_THRESHOLD) {
		return (
			<p itemProp="reviewBody" className="text-muted-foreground text-sm leading-relaxed">
				{content}
			</p>
		);
	}

	return (
		<details className="group">
			<summary className="focus-visible:outline-ring cursor-pointer list-none focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
				<span
					itemProp="reviewBody"
					className={cn(
						"text-muted-foreground text-sm leading-relaxed group-open:line-clamp-none",
						clampLines === 3 ? "line-clamp-3" : "line-clamp-5",
					)}
				>
					{content}
				</span>
				<span className="text-primary hover:text-primary/80 mt-1 block text-xs font-medium group-open:hidden motion-safe:transition-colors">
					Lire la suite
				</span>
				<span className="text-primary hover:text-primary/80 mt-1 hidden text-xs font-medium group-open:block motion-safe:transition-colors">
					Voir moins
				</span>
			</summary>
		</details>
	);
}
