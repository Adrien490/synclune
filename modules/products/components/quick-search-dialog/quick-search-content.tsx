"use client";

import { ChevronRight, Search } from "lucide-react";
import { triggerHaptic } from "@/shared/hooks/use-haptic";

import { Button } from "@/shared/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { Stagger } from "@/shared/components/animations/stagger";
import ScrollFade from "@/shared/components/scroll-fade";
import { matchesWordStart } from "@/modules/products/utils/match-word-start";

import type { QuickSearchResult } from "../../data/quick-search-products";
import { CategoryCard } from "./category-card";
import { CollectionCard } from "./collection-card";
import { LISTBOX_ID, MAX_MATCHED_COLLECTIONS, MAX_MATCHED_TYPES } from "./constants";
import type { QuickSearchCollection, QuickSearchProductType } from "./constants";
import { QuickTagPills } from "./quick-tag-pills";
import { SearchErrorState } from "./search-error-state";
import { SearchResultItem } from "./search-result-item";

interface QuickSearchContentProps {
	results: QuickSearchResult;
	query: string;
	collections: QuickSearchCollection[];
	productTypes: QuickSearchProductType[];
	onSearch: (query: string) => void;
	onClose: () => void;
	onSelectResult: () => void;
	onViewAllResults: () => void;
	/** Re-run the current query (shown on a server-side search error) */
	onRetry: () => void;
}

export function QuickSearchContent({
	results,
	query,
	collections,
	productTypes,
	onSearch,
	onClose,
	onSelectResult,
	onViewAllResults,
	onRetry,
}: QuickSearchContentProps) {
	const isRateLimited = results.kind === "rate-limited";
	const isError = results.kind === "error";
	const products = results.kind === "success" ? results.products : [];
	const suggestion = results.kind === "success" ? results.suggestion : null;
	const totalCount = results.kind === "success" ? results.totalCount : 0;

	// Client-side filtering of collections/categories (word-start match)
	const lowerQuery = query.toLowerCase();
	const matchedCollections = collections
		.filter((c) => matchesWordStart(c.name, lowerQuery))
		.slice(0, MAX_MATCHED_COLLECTIONS);
	const matchedTypes = productTypes
		.filter((t) => matchesWordStart(t.label, lowerQuery))
		.slice(0, MAX_MATCHED_TYPES);

	const hasSearchResults = products.length > 0;
	const hasMatchedNav = matchedCollections.length > 0 || matchedTypes.length > 0;
	// `!suggestion` a été RETIRÉ de cette condition : dès qu'une correction
	// orthographique existait, « Aucun résultat pour X » disparaissait entièrement
	// et l'utilisateur ne voyait que « Vouliez-vous dire Y ? », sans savoir que sa
	// requête n'avait rien donné. `!hasMatchedNav` reste : annoncer « aucun
	// résultat » à côté d'une collection qui matche serait faux.
	// Audit recherche 2026-07-26.
	const showEmptyState = !hasSearchResults && !hasMatchedNav && !isRateLimited && !isError;
	const isSuccess = results.kind === "success";

	return (
		<div className="flex h-full flex-col">
			{/* Screen reader announcement (replaces Suspense fallback "Recherche en cours…") —
				muette en erreur, où un « 0 résultat trouvé » serait faux : l'erreur a son
				propre role=alert (annoncé à l'insertion). Le rate-limit est annoncé ICI et
				non par le bloc visible : celui-ci est inséré AVEC son contenu, pattern connu
				pour ne pas être vocalisé (audit feedback/aria-live 2026-07-26) — seule une
				région déjà montée dont le TEXTE change est annoncée de façon fiable. */}
			<div role="status" aria-live="polite" className="sr-only">
				{isRateLimited
					? "Trop de requêtes — réessaie dans quelques instants."
					: isSuccess
						? `${totalCount} résultat${totalCount !== 1 ? "s" : ""} trouvé${totalCount !== 1 ? "s" : ""}.`
						: ""}
			</div>

			<div className="min-h-0 flex-1">
				<ScrollFade axis="vertical" hideScrollbar={false} className="h-full overscroll-contain">
					<div className="space-y-4 p-4">
						{/* Empty state — rendu AVANT la suggestion : l'ordre de lecture doit
							être « rien trouvé » puis « voici une alternative », pas l'inverse. */}
						{showEmptyState && (
							<Empty variant="borderless" size="sm" role="status" aria-live="polite">
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<Search className="size-5" aria-hidden="true" />
									</EmptyMedia>
									<EmptyTitle className="wrap-break-words w-full text-base">
										Aucun résultat pour &ldquo;{query}&rdquo;
									</EmptyTitle>
								</EmptyHeader>
								<EmptyContent>
									<p className="text-muted-foreground text-center text-xs">
										Essaie avec moins de mots ou parcours nos catégories
									</p>
									<QuickTagPills
										productTypes={productTypes}
										onSelect={onSearch}
										size="xs"
										centered
									/>
								</EmptyContent>
							</Empty>
						)}

						{/* Spell suggestion */}
						{suggestion && (
							<p role="status" aria-live="polite" className="text-muted-foreground text-sm">
								Tu voulais dire{" "}
								{/* Vrai bouton, atteignable au Tab : ce n'est pas une option du
									listbox mais une COMMANDE, et il est désormais rendu hors de
									celui-ci (un listbox ne possède que `option`/`group`). Il perd
									donc `role="option"`, `aria-selected` et `tabIndex={-1}`. */}
								<button
									type="button"
									aria-label={`Rechercher ${suggestion}`}
									onClick={() => {
										triggerHaptic("selection");
										onSearch(suggestion);
									}}
									className="text-foreground decoration-primary/40 hover:decoration-primary focus-visible:ring-ring rounded-sm font-medium underline underline-offset-4 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
								>
									{suggestion}
								</button>
								{" ?"}
							</p>
						)}

						{/* Rate limited — pas de compte à rebours : la Server Action ne renvoie
							aucun `retryAfter`, un compteur serait inventé. Pour en ajouter un,
							exposer d'abord le délai côté `quick-search.ts`. Pas de role=status
							ici : l'annonce SR passe par la région sr-only permanente en tête
							(un bloc inséré avec son contenu n'est pas vocalisé de façon fiable,
							et deux régions feraient une double annonce). */}
						{isRateLimited && (
							<div className="flex flex-col items-center justify-center gap-3 px-4 py-4">
								<p className="text-muted-foreground text-center text-sm">
									Trop de requêtes — réessaie dans quelques instants.
								</p>
								<Button variant="outline" size="sm" onClick={onRetry}>
									Réessayer
								</Button>
							</div>
						)}

						{/* Erreur SERVEUR (`kind: "error"`). À ne pas confondre avec la branche
							du parent, qui traite l'erreur CLIENT/RÉSEAU via `isSearchError()`
							(garde sur une clé `"type"`) : les deux sont atteignables et
							couvrent des pannes distinctes. Le markup est mutualisé dans
							`SearchErrorState` pour que la formulation ne puisse plus diverger. */}
						{isError && !isRateLimited && <SearchErrorState onRetry={onRetry} />}

						{/* LISTBOX — périmètre ARIA, distinct du conteneur de navigation
							(`#qs-results`). Il n'enveloppe QUE des `role="group"` contenant des
							`role="option"` : un listbox ne peut posséder que ces deux rôles. Le
							rôle portait auparavant sur le conteneur entier, qui contient aussi
							l'état vide (`role="status"`), la suggestion, les messages d'erreur et
							le CTA de pied — enfants illégaux, que certains lecteurs d'écran
							élaguent. Rendu même vide : `aria-controls` doit toujours résoudre en
							mode recherche. Audit recherche 2026-07-26. */}
						<div
							id={LISTBOX_ID}
							role="listbox"
							aria-label="Résultats de recherche"
							className="space-y-4"
						>
							{/* Matched collections — role="group" (not <section>) to avoid a
								landmark region nested inside the results listbox */}
							{matchedCollections.length > 0 && (
								<div role="group" aria-label="Collections correspondantes">
									<h3
										aria-hidden="true"
										className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase"
									>
										Collections
									</h3>
									<div className="space-y-1">
										{matchedCollections.map((collection) => (
											<CollectionCard
												key={collection.slug}
												collection={collection}
												onSelect={onClose}
												variant="compact"
												query={query}
												inListbox
											/>
										))}
									</div>
								</div>
							)}

							{/* Matched product types */}
							{matchedTypes.length > 0 && (
								<div role="group" aria-label="Catégories correspondantes">
									<h3
										aria-hidden="true"
										className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase"
									>
										Catégories
									</h3>
									<div className="space-y-1">
										{matchedTypes.map((type) => (
											<CategoryCard
												key={type.slug}
												type={type}
												onSelect={onClose}
												variant="compact"
												query={query}
											/>
										))}
									</div>
								</div>
							)}

							{/* Product results */}
							{hasSearchResults && (
								<div role="group" aria-label="Produits">
									<h3
										aria-hidden="true"
										className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase"
									>
										Produits
									</h3>
									{products.length < totalCount && (
										// « N affichés » et non « N sur T » : `totalCount` sous-compte dès
										// que la branche floue sature ses 6 places (cf.
										// `quick-search-products.ts`), donc le total pouvait contredire
										// /produits?search=. On n'affiche plus que ce qu'on garantit.
										<p aria-hidden="true" className="text-muted-foreground mb-2 text-xs">
											{products.length} affichés
										</p>
									)}
									<Stagger className="space-y-0.5" stagger={0.02} delay={0.03} y={4}>
										{products.map((product) => (
											<SearchResultItem
												key={product.id}
												product={product}
												query={query}
												onSelect={onSelectResult}
											/>
										))}
									</Stagger>
								</div>
							)}
						</div>
					</div>
				</ScrollFade>
			</div>

			{/* Footer — rendu dès que la recherche a abouti, y compris à 0 résultat.
				Auparavant `{totalCount > 0 && …}` : à zéro résultat le dialog n'offrait
				AUCUN chemin vers /produits?search=, donc la page de repli
				(`SearchFallbackSuggestions` : dernières créations, grille de catégories,
				lien de correction préservant les filtres) était inatteignable depuis la
				recherche rapide. Audit recherche 2026-07-26.

				Le libellé ne porte plus de nombre : `totalCount` sous-compte quand la
				branche floue sature (cf. `quick-search-products.ts`), et faire converger
				les deux exigerait une seconde requête de comptage dans le chemin chaud
				pour un chiffre sur lequel personne n'agit.

				C'est une COMMANDE, pas une option : il est rendu hors du listbox et
				redevient un vrai bouton atteignable au Tab (plus de `role="option"`, ni
				`aria-selected`, ni `tabIndex={-1}`). Il sort donc du roving aux flèches —
				sans perte : Entrée dans le champ, sans option active, déclenche déjà la
				même navigation via `onSubmit`. */}
			{isSuccess && (
				<div className="border-border bg-background/95 shrink-0 border-t px-4 py-3 backdrop-blur-sm">
					<Button onClick={onViewAllResults} className="w-full">
						{totalCount === 0
							? `Rechercher « ${query} » dans tout le catalogue`
							: "Voir tous les résultats"}
						<ChevronRight className="size-4" aria-hidden="true" />
					</Button>
				</div>
			)}
		</div>
	);
}
