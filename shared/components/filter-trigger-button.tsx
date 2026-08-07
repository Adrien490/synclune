"use client";

import { Suspense } from "react";
import { FunnelIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useActiveListControls } from "@/shared/hooks/use-active-list-controls";
import { useToolbarDrawer } from "@/shared/hooks/use-toolbar-drawer";
import type { SheetId } from "@/shared/types/store.types";
import { cn } from "@/shared/utils/cn";

interface FilterTriggerButtonProps {
	/** Identifiant du tiroir à ouvrir dans le `SheetStore` partagé. */
	sheetId?: SheetId;
	className?: string;
	/** Préfixe des params de filtre, si le module s'écarte de `filter_`. */
	filterPrefix?: string;
}

/**
 * Déclencheur « Filtres » de la barre d'outils desktop.
 *
 * ## Pourquoi ce composant existe
 *
 * Chaque page liste admin montait sa feuille de filtres **deux fois** : une fois
 * dans sa barre basse (contrôlée, `hideTrigger`) et une fois dans sa `Toolbar`
 * desktop (non contrôlée, uniquement pour obtenir son déclencheur intégré). Or
 * les `*FilterSheet` basculent DÉJÀ bottom-sheet ↔ right-sheet selon le viewport
 * via `FilterSheetWrapper` — le second montage n'apportait aucune bascule.
 *
 * Il coûtait cher : `products-filter-sheet.tsx` crée cinq hooks d'état dans son
 * corps, donc la page portait **deux brouillons de filtres indépendants**, dont
 * un seul était atteignable, et ~2 400 lignes de composants s'instanciaient en
 * double sur les huit listes.
 *
 * Ce bouton rend le déclencheur SEUL et pousse l'ouverture dans le `SheetStore`
 * partagé (`useToolbarDrawer`) — exactement le canal que la barre basse utilise
 * déjà, et la raison pour laquelle cet état n'est pas un `useState` local. Un
 * panneau, deux déclencheurs, un seul état.
 *
 * Le compte de filtres actifs vient de `useActiveListControls`, la SSOT qui
 * alimente aussi les pastilles des barres basses — pas d'une prop, sinon les
 * huit pages recopieraient la même boucle sur `searchParams`.
 *
 * Rendu repris verbatim du `defaultTrigger` de `FilterSheetWrapper` (qui le
 * garde pour ses appelants non contrôlés), région live comprise : gatée sur
 * `activeFiltersCount > 0` elle se montait avec son texte, donc la transition
 * 0 → 1 filtre — la seule qui informe vraiment — n'était jamais annoncée.
 */
function FilterTriggerButtonInner({
	sheetId = "filter",
	className,
	filterPrefix,
}: FilterTriggerButtonProps) {
	const { open } = useToolbarDrawer();
	const { activeFilterCount } = useActiveListControls(filterPrefix);

	return (
		<Button
			variant="outline"
			onClick={() => open(sheetId)}
			className={cn(
				"border-border/60 hover:border-border hover:bg-accent/30 hover:border-accent/50 relative min-h-11 gap-2 px-4 text-sm font-medium transition-colors duration-200",
				activeFilterCount > 0 && "border-primary/50 bg-primary/5 shadow-primary/10 shadow-sm",
				className,
			)}
			aria-label={
				activeFilterCount > 0
					? `Filtres - ${activeFilterCount} actif${activeFilterCount > 1 ? "s" : ""}`
					: "Filtres"
			}
		>
			<FunnelIcon className="size-4" aria-hidden="true" />
			<span>Filtres</span>
			{activeFilterCount > 0 && (
				<Badge
					variant="default"
					className="animate-in zoom-in-50 absolute -top-2.5 -right-2.5 flex h-5 min-w-5 items-center justify-center px-1 text-xs font-bold shadow-sm duration-200"
					aria-hidden="true"
				>
					{activeFilterCount}
				</Badge>
			)}
			<span className="sr-only" aria-live="polite" aria-atomic="true">
				{activeFilterCount > 0
					? `${activeFilterCount} filtre${activeFilterCount > 1 ? "s" : ""} actif${activeFilterCount > 1 ? "s" : ""}`
					: ""}
			</span>
		</Button>
	);
}

/** Frontière obligatoire : `useActiveListControls` lit `useSearchParams()`. */
export function FilterTriggerButton(props: FilterTriggerButtonProps) {
	return (
		<Suspense fallback={null}>
			<FilterTriggerButtonInner {...props} />
		</Suspense>
	);
}
