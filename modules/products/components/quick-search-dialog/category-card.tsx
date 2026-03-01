"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Tap } from "@/shared/components/animations/tap";
import { cn } from "@/shared/utils/cn";

import type { QuickSearchProductType } from "./constants";

interface CategoryCardProps {
	type: QuickSearchProductType;
	onSelect: () => void;
	/** Compact variant for search results, full variant for idle */
	variant?: "compact" | "full";
}

export function CategoryCard({ type, onSelect, variant = "full" }: CategoryCardProps) {
	const isCompact = variant === "compact";

	return (
		<Tap scale={0.97}>
			<Link
				href={`/produits/${type.slug}`}
				onClick={onSelect}
				data-active={undefined}
				className={cn(
					"rounded-xl text-left font-medium transition-all",
					"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
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
					<Sparkles className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
				)}
				<span className={isCompact ? "truncate" : undefined}>{type.label}</span>
			</Link>
		</Tap>
	);
}
