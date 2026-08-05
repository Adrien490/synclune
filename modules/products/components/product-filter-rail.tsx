"use client";

import { use, useState, Suspense, type ComponentProps } from "react";
import { useSearchParams } from "next/navigation";

import { XIcon } from "@phosphor-icons/react/ssr";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { MaskingTape } from "@/shared/components/masking-tape";
import { Spinner } from "@/shared/components/ui/spinner";

import { ProductFilterCompartments } from "./product-filter-compartments";
import { useImmediateProductFilters } from "@/modules/products/hooks/use-immediate-product-filters";
import { useLiveFilterCount } from "@/modules/products/hooks/use-live-filter-count";
import {
	emptyStateHint,
	getSectionActiveCount,
} from "@/modules/products/services/product-filter-params.service";

import type { FilterFormData } from "@/modules/products/services/product-filter-params.service";
import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";
import type { ProductTypeOption } from "./filter-section-types";

// ============================================================================
// CONSTANTS
// ============================================================================

const EMPTY_COLORS: GetColorsReturn["colors"] = [];
const EMPTY_MATERIALS: MaterialOption[] = [];
const EMPTY_PRODUCT_TYPES: ProductTypeOption[] = [];

/** Seuil au-delà duquel « Tout effacer » demande confirmation — aligné sur le panneau. */
const CONFIRM_CLEAR_THRESHOLD = 3;

// ============================================================================
// TYPES
// ============================================================================

interface ProductFilterRailProps {
	colors: GetColorsReturn["colors"];
	materials: MaterialOption[];
	productTypes?: ProductTypeOption[];
	maxPriceInEuros: number;
	/** Type de produit actif (depuis le path segment /produits/[type]) */
	activeProductTypeSlug?: string;
	/**
	 * Catalogue courant — le pied du rail y lit `totalCount`, le chiffre que la
	 * grille affiche déjà. Même contrat que `initialCountPromise` du panneau :
	 * consommée par `use()` dans sa propre frontière `Suspense`, jamais awaitée
	 * chez l'appelant. Optionnelle : sans elle, le pied ne rend que
	 * « Tout effacer les filtres ».
	 */
	resultCountPromise?: Promise<{ totalCount: number }>;
}

// ============================================================================
// FOOTER — « Le comptoir répond »
// ============================================================================

/**
 * Corps du pied de plaque : le compte de pièces qui s'accordent aux filtres,
 * et la sortie chiffrée quand il tombe à zéro.
 *
 * - **Le nombre vient de la page** (`use(resultCountPromise)`), jamais d'un
 *   recomptage : chaque coche navigue, donc le serveur a déjà compté.
 * - **`useLiveFilterCount` n'est armé qu'à zéro résultat** : son seul rôle ici
 *   est la relaxation (« Retire la couleur pour en voir 4 ») — l'armer en
 *   permanence doublerait chaque navigation d'une Server Action (et d'un
 *   réveil Neon) pour un chiffre déjà connu. Premier zéro « à froid » (arrivée
 *   par URL) : pas de groupe fraîchement modifié, la copie générique suffit.
 */
function RailFooterBody({
	resultCountPromise,
	values,
	maxPriceInEuros,
	isPending,
	onClearAll,
}: {
	resultCountPromise?: Promise<{ totalCount: number }>;
	values: FilterFormData;
	maxPriceInEuros: number;
	isPending: boolean;
	onClearAll: () => void;
}) {
	const searchParams = useSearchParams();
	const search = searchParams.get("search") ?? undefined;
	const totalCount = resultCountPromise ? use(resultCountPromise).totalCount : null;

	const live = useLiveFilterCount({
		values,
		maxPriceInEuros,
		search,
		enabled: totalCount === 0,
		initialCount: totalCount,
	});

	const emptyHint = totalCount === 0 ? (emptyStateHint(live) ?? null) : null;

	const clearButton = (
		<Button
			variant="ghost"
			size="sm"
			onClick={onClearAll}
			className="text-muted-foreground can-hover:hover:bg-destructive/10 can-hover:hover:text-destructive has-focus-visible:bg-destructive/10 min-h-11 shrink-0 justify-start px-2 text-xs transition-colors"
		>
			<XIcon className="mr-1 size-3" aria-hidden="true" />
			Tout effacer les filtres
		</Button>
	);

	if (emptyHint) {
		return (
			<div className="flex flex-col items-start pt-2">
				<p className="text-[0.8125rem] leading-snug font-medium">{emptyHint}</p>
				{clearButton}
			</div>
		);
	}

	return (
		<div className="flex min-h-11 items-center justify-between gap-2">
			<span className="min-w-0 text-[0.8125rem]">
				{isPending && (
					<Spinner presentational className="mr-1.5 inline-block size-3 align-[-0.125rem]" />
				)}
				{totalCount !== null && (
					<>
						<span className="font-semibold tabular-nums">{totalCount}</span> pièce
						{totalCount > 1 ? "s" : ""}
					</>
				)}
			</span>
			{clearButton}
		</div>
	);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Le rail de filtres desktop — « Le plan de travail » (artifact filtres
 * 2026-08-04, direction C), habillé « Le comptoir » (audit rail 2026-08-05,
 * direction D, lots 1-2).
 *
 * @description
 * À partir de `lg`, le filtre cesse d'être posé **sur** le catalogue : il en
 * devient la colonne gauche. Plus de scrim, donc plus d'aveuglement — on coche
 * et la grille se recompose derrière, dans la même vue.
 *
 * ## Trois choix qui ne se devinent pas
 *
 * - **Chaque coche navigue** (`useImmediateProductFilters`), la vue optimiste
 *   peint l'état avant la réponse RSC. Le prix, lui, ne committe qu'au
 *   relâchement — un `router.replace` par frame de drag serait ingérable.
 * - **`data-pending` sur la racine du rail.** Le rail est rendu DANS
 *   `#product-container`, donc son attribut active le grisage
 *   `CATALOG_PENDING_DIM` posé cellule par cellule sur la grille — gratuitement.
 *   C'est aussi ce qui répare un trou du panneau : porté par un panneau
 *   portalisé, son `data-pending` ne pouvait PAS atteindre `group/container`.
 * - **`hidden lg:block`, jamais un `useMediaQuery`.** Le rail est toujours dans
 *   le DOM ; gater son montage en JS créerait un écart d'hydratation, et ses
 *   données viennent déjà du serveur en props.
 *
 * ## « Le comptoir » — une seule surface d'état à `lg`
 *
 * Le bandeau de badges est gaté `lg:hidden` chez le shell : à ce viewport,
 * l'état des filtres se lit ICI (coches + badges de compartiments) et se
 * totalise dans le **pied de plaque** — compte de pièces toujours visible
 * (le pied ne défile pas) + « Tout effacer les filtres ». L'en-tête est
 * l'étiquette du meuble : le seul mot du rail en display, posé sur la tape.
 * En-tête et pied sont `shrink-0` : dans le `flex-col` plafonné de la plaque,
 * seul le conteneur `min-h-0` du milieu cède de la hauteur.
 *
 * La confirmation d'effacement reste un `AlertDialog` (comme dans le panneau —
 * le refus déjà exprimé vaut à tous les viewports), rendue dans l'arbre du rail.
 */
function ProductFilterRailInner({
	colors = EMPTY_COLORS,
	materials = EMPTY_MATERIALS,
	productTypes = EMPTY_PRODUCT_TYPES,
	maxPriceInEuros,
	activeProductTypeSlug,
	resultCountPromise,
}: ProductFilterRailProps) {
	const [confirmClearOpen, setConfirmClearOpen] = useState(false);

	const { values, isPending, toggleToken, setPriceRange, setAvailability, resetSection, clearAll } =
		useImmediateProductFilters({ maxPriceInEuros, activeProductTypeSlug });

	/**
	 * Prix en cours de glissement, AVANT commit. Le rail n'applique le prix qu'au
	 * relâchement (une navigation par frame serait ingérable), mais sans cet état
	 * le badge « 20€ - 80€ » de l'en-tête restait figé sur la valeur d'URL pendant
	 * tout le drag — alors qu'il suit la poignée dans le panneau. Même composant,
	 * deux comportements.
	 */
	const [draftPriceRange, setDraftPriceRange] = useState<[number, number] | null>(null);

	// Les compartiments lisent le brouillon quand il existe : seul l'AFFICHAGE
	// avance, la navigation reste au commit.
	const displayValues = draftPriceRange ? { ...values, priceRange: draftPriceRange } : values;

	const counts = getSectionActiveCount(displayValues, [0, maxPriceInEuros]);
	const activeFiltersCount = Object.values(counts).reduce((sum, n) => sum + n, 0);

	const handleClearAll = () => {
		if (activeFiltersCount >= CONFIRM_CLEAR_THRESHOLD) {
			setConfirmClearOpen(true);
			return;
		}
		clearAll();
	};

	return (
		<div
			// `self-stretch` n'est pas décoratif : le shell pose `lg:items-start` sur la
			// grille [rail | contenu], donc SANS lui cette colonne fait exactement la
			// hauteur de son contenu — et un `sticky` dont le bloc conteneur a la même
			// hauteur que lui n'a AUCUNE course : il défile avec la page, sans jamais
			// s'accrocher. Le rail réclame donc la hauteur de sa rangée, et c'est le
			// `max-h` du conteneur de défilement ci-dessous qui le borne au viewport.
			className="hidden self-stretch lg:block"
			// Le grisage de la grille est un `group-has-[[data-pending]]/container`
			// (cf. `catalog-grid.constants.ts`) : cet attribut est le seul lien.
			data-pending={isPending ? "" : undefined}
			aria-busy={isPending}
		>
			{/*
			 * « La salle rose » (audit /produits 2026-08-05, direction B) : le rail est
			 * la seule surface teintée de la page — une plaque `--primary` à 5 %, bord à
			 * 25 %. Le même vocabulaire que les cartes, appliqué au meuble : un
			 * formulaire devient un pan de l'atelier.
			 *
			 * La plaque porte le STICKY et le plafond de hauteur ; le défilement, lui,
			 * reste sur l'enfant du milieu. Les deux ne peuvent pas fusionner :
			 * `scroll-fade-y` est un `mask-image`, qui dissoudrait AUSSI le fond et le
			 * bord de la plaque à ses lisières. `flex-col` + `min-h-0` bornent l'enfant
			 * au plafond de la plaque — sans le `min-h-0`, il pousse la plaque au-delà
			 * du viewport et ne défile jamais.
			 */}
			<div className="border-primary/25 bg-primary/5 sticky top-[calc(var(--navbar-height-static)+1rem)] flex max-h-[calc(100dvh-var(--navbar-height-static)-2rem)] flex-col rounded-md border">
				{/*
				 * L'étiquette du meuble (« Le comptoir », lot 1) : le titre est le seul
				 * mot du rail en display — 18 px contre les 10 px des étiquettes de
				 * tiroirs, les deux crans qui manquaient. La tape passe DERRIÈRE le
				 * titre (porte-étiquette, même geste que les boutons actifs de la
				 * barre) ; le `h2`, positionné et déclaré après elle, peint au-dessus.
				 * Nom accessible « Filtres » verrouillé par la spec E2E (égalité
				 * stricte) — le spinner d'à côté est présentationnel, il n'y entre pas,
				 * et il ne se rend ici QUE lorsque le pied (qui le porte sinon) est
				 * absent : pendant l'effacement du dernier filtre, notamment.
				 */}
				<div className="relative shrink-0 px-4 pt-3 pb-1.5">
					<MaskingTape className="top-3.5 left-3 h-[1.125rem] w-[4.5rem] -rotate-2" />
					<h2 className="font-display relative flex items-center gap-2 text-lg font-normal">
						Filtres
						{isPending && activeFiltersCount === 0 && <Spinner presentational className="size-3" />}
					</h2>
				</div>
				{/*
				 * `px-3` n'est pas décoratif : tout le corps de filtres déborde en négatif
				 * (`-mx-3` par ligne, `-mx-6` par en-tête collant) pour que ses fonds
				 * atteignent les bords de l'hôte. Sans padding, ces débords sortaient de la
				 * colonne — et comme ce conteneur est `overflow-y-auto`, CSS promeut
				 * `overflow-x` à `auto` : le rail défilait horizontalement de 12 px.
				 * La valeur doit rester égale à `HOST_GUTTER.rail`.
				 *
				 * `scroll-fade-y` et `no-scrollbar` appartiennent au conteneur QUI DÉFILE, pas
				 * à un enfant : le fondu est une `animation-timeline: scroll(self y)` (inactive
				 * sur un élément non défilant, donc muette) et `no-scrollbar` masque la barre
				 * DE cet élément. Posés un niveau plus bas, les deux étaient inertes — le rail
				 * exhibait une barre système nue au lieu de s'estomper en haut et en bas.
				 */}
				<div className="scroll-fade-y no-scrollbar min-h-0 overflow-y-auto overscroll-contain rounded-[inherit] px-3 pt-1 pb-2">
					<ProductFilterCompartments
						host="rail"
						productTypes={productTypes}
						colors={colors}
						materials={materials}
						maxPriceInEuros={maxPriceInEuros}
						values={displayValues}
						counts={counts}
						onToggle={toggleToken}
						// Le drag ne navigue pas : il n'avance que le brouillon, donc le
						// badge de l'en-tête suit la poignée. Seul le relâchement applique.
						onPriceChange={setDraftPriceRange}
						onPriceCommit={(range) => {
							setDraftPriceRange(null);
							setPriceRange(range);
						}}
						onAvailabilityChange={setAvailability}
						onSectionReset={resetSection}
					/>
				</div>

				{/*
				 * Le pied du comptoir (« Le comptoir », lot 2) : la réponse vit là où la
				 * question se pose. Compte de pièces (celui que la grille affiche —
				 * même promesse), sortie chiffrée à zéro résultat, « Tout effacer les
				 * filtres ». Hors du conteneur défilant : il reste visible quel que
				 * soit le défilement interne du rail — c'est tout son intérêt.
				 */}
				{activeFiltersCount > 0 && (
					<div className="border-primary/25 bg-primary/10 shrink-0 rounded-b-[inherit] border-t px-3 py-0.5">
						<Suspense
							fallback={
								<div className="flex min-h-11 items-center">
									<Spinner presentational className="size-3.5" />
								</div>
							}
						>
							<RailFooterBody
								resultCountPromise={resultCountPromise}
								values={displayValues}
								maxPriceInEuros={maxPriceInEuros}
								isPending={isPending}
								onClearAll={handleClearAll}
							/>
						</Suspense>
					</div>
				)}
			</div>

			<AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Effacer tous les filtres ?</AlertDialogTitle>
						<AlertDialogDescription>
							{activeFiltersCount} filtre{activeFiltersCount > 1 ? "s sont actifs" : " est actif"}.
							Tu pourras les rétablir en revenant en arrière dans ton navigateur.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button">Annuler</AlertDialogCancel>
						<AlertDialogAction
							type="button"
							onClick={() => {
								clearAll();
								setConfirmClearOpen(false);
							}}
						>
							Tout effacer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

export function ProductFilterRail(props: ComponentProps<typeof ProductFilterRailInner>) {
	// `useSearchParams` exige une frontière Suspense sous `cacheComponents`.
	return (
		<Suspense fallback={<div className="hidden lg:block" aria-hidden="true" />}>
			<ProductFilterRailInner {...props} />
		</Suspense>
	);
}
