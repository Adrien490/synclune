"use client";

import { ArrowUpDown, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { useActiveListControls, useToolbarDrawer } from "@/shared/hooks";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { withViewTransition } from "@/shared/utils/view-transition";

interface AdminSortBadgeProps {
	/** Map valeur sortBy → label affiché. Ex: { "name-ascending": "Nom A→Z" } */
	sortLabels: Record<string, string>;
	/** Valeur par défaut, utilisée comme fallback si sortBy URL absent. */
	defaultSort: string;
	/** Param URL à lire/écrire. Défaut: "sortBy". */
	sortKey?: string;
}

/**
 * Chip mobile uniquement affichant le tri actif "Trié par : X".
 * Tap = ouvre le SortDrawer (via useToolbarDrawer).
 * X latéral = reset au tri par défaut + withViewTransition + haptic light.
 *
 * Affiché uniquement si sortBy URL !== null. Place avant FilterBadges pour
 * cohérence visuelle "état de la liste". Wrapper Suspense inclus (lit URL).
 */
function AdminSortBadgeInner({ sortLabels, defaultSort, sortKey = "sortBy" }: AdminSortBadgeProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { hasActiveSort } = useActiveListControls();
	const { open } = useToolbarDrawer<"sort" | "search" | "filter">();

	if (!hasActiveSort) return null;

	const sortValue = searchParams.get(sortKey) ?? defaultSort;
	const label = sortLabels[sortValue] ?? sortValue;

	const handleReset = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		triggerHaptic("light");
		const params = new URLSearchParams(searchParams.toString());
		params.delete(sortKey);
		// Conserver un curseur en changeant le tri est silencieusement faux : Prisma
		// se repositionne sur cet id dans le NOUVEL orderBy puis `skip: 1` → tranche
		// arbitraire. Même règle que use-url-param / use-filter / sort-drawer —
		// cette surface était la seule à l'oublier (audit 2026-08-01, P2).
		params.delete("cursor");
		params.delete("direction");
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
					<ArrowUpDown className="size-3" aria-hidden="true" />
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
					<X className="size-3.5" aria-hidden="true" />
				</button>
			</Badge>
		</div>
	);
}

export function AdminSortBadge(props: AdminSortBadgeProps) {
	return (
		<Suspense fallback={null}>
			<AdminSortBadgeInner {...props} />
		</Suspense>
	);
}
