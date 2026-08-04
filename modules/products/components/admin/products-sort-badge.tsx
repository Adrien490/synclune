"use client";

import { ArrowsDownUpIcon, XIcon } from "@phosphor-icons/react/ssr";
import { Suspense } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { useActiveListControls, useToolbarDrawer } from "@/shared/hooks";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useRouter, useSearchParams } from "next/navigation";
import { withViewTransition } from "@/shared/utils/view-transition";

import {
	ADMIN_PRODUCTS_SORT_LABELS,
	GET_PRODUCTS_DEFAULT_SORT_BY,
} from "../../constants/product.constants";

/**
 * Chip visible mobile + desktop affichant le tri actif "Trie par : X".
 * Clic = ouvre le SortDrawer (mobile) / scroll vers SelectFilter (desktop).
 * X latéral = reset au tri par defaut.
 *
 * Affiché uniquement si sortBy !== default. Place avant FilterBadges pour
 * cohérence visuelle "etat de la liste".
 */
function ProductsSortBadgeInner() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { hasActiveSort } = useActiveListControls();
	const { open } = useToolbarDrawer<"sort" | "search" | "filter">();

	if (!hasActiveSort) return null;

	const sortValue = searchParams.get("sortBy") ?? GET_PRODUCTS_DEFAULT_SORT_BY;
	const label =
		ADMIN_PRODUCTS_SORT_LABELS[sortValue as keyof typeof ADMIN_PRODUCTS_SORT_LABELS] ?? sortValue;

	const handleReset = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		triggerHaptic("light");
		const params = new URLSearchParams(searchParams.toString());
		params.delete("sortBy");
		withViewTransition(() => router.push(`?${params.toString()}`, { scroll: false }));
	};

	return (
		<div className="mb-2 flex flex-wrap items-center gap-2 md:hidden">
			<Badge
				variant="secondary"
				className="min-h-9 gap-1.5 pr-1 pl-2 motion-safe:transition-colors"
			>
				<button
					type="button"
					onClick={() => {
						triggerHaptic("selection");
						open("sort");
					}}
					className="flex touch-manipulation items-center gap-1.5 text-left [-webkit-tap-highlight-color:transparent]"
					aria-label={`Modifier le tri (actuel : ${label})`}
				>
					<ArrowsDownUpIcon className="size-3" aria-hidden="true" />
					<span className="text-xs">
						Trié par : <strong>{label}</strong>
					</span>
				</button>
				<button
					type="button"
					onClick={handleReset}
					aria-label="Effacer le tri"
					className="text-muted-foreground can-hover:hover:text-foreground focus-ring relative inline-flex size-7 touch-manipulation items-center justify-center rounded-full [-webkit-tap-highlight-color:transparent] before:absolute before:-inset-2 before:content-['']"
				>
					<XIcon className="size-3.5" aria-hidden="true" />
				</button>
			</Badge>
		</div>
	);
}

export function ProductsSortBadge() {
	return (
		<Suspense fallback={null}>
			<ProductsSortBadgeInner />
		</Suspense>
	);
}
