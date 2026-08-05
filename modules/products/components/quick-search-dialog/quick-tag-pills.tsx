"use client";

import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

import type { QuickSearchProductType } from "./constants";

interface QuickTagPillsProps {
	productTypes: QuickSearchProductType[];
	onSelect: (label: string) => void;
	/** "sm" for idle mode, "xs" for empty state */
	size?: "sm" | "xs";
	centered?: boolean;
	/**
	 * `"row"` — **une seule ligne, défilement horizontal**. C'est la disposition du
	 * panneau au repos, et elle n'est pas cosmétique : en `"wrap"`, les 7 catégories
	 * du catalogue de dev enroulaient sur **3 lignes = 152 px** (relevé au
	 * navigateur), soit **51 % du chrome au-dessus de la zone de contenu** — plus
	 * que le champ de recherche lui-même, et pour une dernière ligne ne portant
	 * qu'une pilule. `getQuickSearchData` en charge jusqu'à 12 : 4 à 5 lignes sur un
	 * catalogue complet.
	 *
	 * Clavier ouvert sur mobile (`--vvh` ≈ 508 px), ce chrome laissait 209 px pour
	 * TOUT le contenu — le nuancier lui-même y était coupé, et recherches récentes,
	 * collections et CTA passaient sous la ligne de flottaison dès l'ouverture.
	 * Une ligne unique rend ~100 px, soit près de la moitié de la zone visible.
	 *
	 * `"wrap"` (défaut) reste celle de l'état « aucun résultat » : le bloc y est
	 * centré dans une colonne étroite, où l'enroulement est le bon comportement.
	 *
	 * Audit UI/UX 2026-08-05, lot 5 — mesuré, pas déduit.
	 * @default "wrap"
	 */
	layout?: "wrap" | "row";
}

export function QuickTagPills({
	productTypes,
	onSelect,
	size = "sm",
	centered = false,
	layout = "wrap",
}: QuickTagPillsProps) {
	if (productTypes.length === 0) return null;

	const isRow = layout === "row";

	const pills = productTypes.map((type) => (
		<button
			key={type.slug}
			type="button"
			aria-label={`Rechercher ${type.label}`}
			onClick={() => {
				triggerHaptic("selection");
				onSelect(type.label);
			}}
			className={cn(
				"bg-muted/30 hover:bg-muted inline-flex items-center justify-center rounded-full border",
				size === "sm" ? "text-sm" : "text-xs",
				"min-h-11 px-3.5 py-1.5 sm:min-h-9 sm:px-3",
				"touch-manipulation transition-colors",
				"focus-ring",
				// En rail, une pilule ne se comprime pas : elle sort du champ visible et
				// on va la chercher au doigt. En `wrap`, la laisser compressible évite
				// qu'un libellé plus large que le conteneur ne déborde.
				isRow && "shrink-0 whitespace-nowrap",
			)}
		>
			{type.label}
		</button>
	));

	if (isRow) {
		return (
			<div
				data-slot="scroll-fade-container"
				// Le rail saigne jusqu'au bord de l'écran (`-mx-4`) : sans opt-out, un
				// défilement au doigt parti de ce bord déclenche `useEdgeSwipe` (geste
				// d'ouverture du menu). Même parade que « Vus récemment ».
				data-no-edge-swipe=""
				// `-mx-4 … px-4` : le rail occupe toute la largeur (le fondu de bord tombe
				// donc sur le bord de l'écran, pas au milieu d'une gouttière) tandis que la
				// première et la dernière pilule restent alignées sur le reste du panneau.
				className="scroll-fade-x no-scrollbar -mx-4 w-full overflow-x-auto overflow-y-hidden px-4"
			>
				<div
					role="group"
					aria-label="Suggestions de catégories"
					className="flex w-fit min-w-full gap-1.5"
				>
					{pills}
				</div>
			</div>
		);
	}

	return (
		<div
			role="group"
			aria-label="Suggestions de catégories"
			className={cn("flex flex-wrap gap-1.5", centered && "justify-center")}
		>
			{pills}
		</div>
	);
}
