"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SparkleIcon } from "@phosphor-icons/react/ssr";

import { Tap } from "@/shared/components/animations/tap";
import { cn } from "@/shared/utils/cn";

import type { QuickSearchProductType } from "./constants";
import { HighlightMatch } from "./search-result-item";
import { PAGE_FADE_NAVIGATION } from "@/shared/constants/view-transitions";

interface CategoryCardProps {
	type: QuickSearchProductType;
	onSelect: () => void;
	/** Compact variant for search results, full variant for idle */
	variant?: "compact" | "full";
	/** Search query for highlighting in compact mode */
	query?: string;
}

export function CategoryCard({ type, onSelect, variant = "full", query }: CategoryCardProps) {
	const isCompact = variant === "compact";
	const router = useRouter();
	const href = `/produits/${type.slug}`;

	const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
		// Let the browser handle modifier clicks (new tab, etc.)
		if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
		event.preventDefault();
		onSelect();
		// `replace`, jamais `push` : ce handler `preventDefault()` donc Next sort AVANT
		// de lire la prop `replace` du `<Link>`. C'est ici que la navigation se décide.
		router.replace(href, PAGE_FADE_NAVIGATION);
	};

	return (
		<Tap scale={0.97}>
			<Link
				href={href}
				// `replace` : consomme l'entrée d'historique du dialog (CLAUDE.md § Overlays).
				replace
				onClick={handleClick}
				data-active={undefined}
				data-qs-option=""
				role="option"
				aria-selected={false}
				// Out of the Tab order: reached via arrow keys (combobox pattern).
				tabIndex={-1}
				className={cn(
					"rounded-xl text-left font-medium transition-all",
					"touch-manipulation",
					"focus-ring",
					"data-[active=true]:bg-muted",
					isCompact
						? "hover:bg-muted flex items-center gap-2 px-3 py-2.5"
						: cn(
								"block min-h-12 px-4 py-3",
								"bg-muted/40 hover:bg-muted hover:border-border border border-transparent",
								"data-[active=true]:border-border",
							),
				)}
			>
				{isCompact && (
					<SparkleIcon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
				)}
				<span className={isCompact ? "truncate" : undefined}>
					{isCompact && query ? <HighlightMatch text={type.label} query={query} /> : type.label}
				</span>
			</Link>
		</Tap>
	);
}
