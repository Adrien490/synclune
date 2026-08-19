"use client";

import { CaretRightIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react/ssr";
import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { Stagger } from "@/shared/components/animations/stagger";
import { Tap } from "@/shared/components/animations/tap";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

import { CollectionCard } from "./collection-card";
import { ColorWall } from "./color-wall";
import type { QuickSearchCollection, QuickSearchColor } from "./constants";
import { PAGE_FADE_NAVIGATION } from "@/shared/constants/view-transitions";

interface IdleContentProps {
	searches: string[];
	collections: QuickSearchCollection[];
	/** Le nuancier — déjà vide côté serveur si le catalogue a trop peu de teintes. */
	colors: QuickSearchColor[];
	onClose: () => void;
	onRecentSearch: (term: string) => void;
	onRemoveSearch: (term: string) => void;
	onClearSearches: () => void;
	isPending: boolean;
}

export function IdleContent({
	searches,
	collections,
	colors,
	onClose,
	onRecentSearch,
	onRemoveSearch,
	onClearSearches,
	isPending,
}: IdleContentProps) {
	const hasContent = searches.length > 0 || collections.length > 0 || colors.length > 0;
	const router = useRouter();
	const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

	/**
	 * Fermeture différée d'une frame, pour que la navigation démarre avant que
	 * l'arbre ne soit démonté.
	 *
	 * **C'est la SEULE stratégie de fermeture du panneau au repos.** Les deux CTA
	 * de sortie appelaient `onClose()` en direct : trois affordances pour une même
	 * intention, dont deux se comportaient différemment sans qu'aucune raison ne
	 * soit écrite. Audit UI/UX 2026-08-05 (P3-10).
	 */
	const handleNavigateClose = () => {
		requestAnimationFrame(() => onClose());
	};

	const handleViewAllCollections = (event: React.MouseEvent<HTMLAnchorElement>) => {
		if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
		event.preventDefault();
		triggerHaptic("light");
		handleNavigateClose();
		// `replace`, jamais `push` : ce handler `preventDefault()` donc Next sort AVANT
		// de lire la prop `replace` du `<Link>`. C'est ici que la navigation se décide.
		router.replace("/collections", PAGE_FADE_NAVIGATION);
	};

	const handleViewAllProducts = (event: React.MouseEvent<HTMLAnchorElement>) => {
		if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
		event.preventDefault();
		triggerHaptic("light");
		handleNavigateClose();
		// `replace`, jamais `push` : ce handler `preventDefault()` donc Next sort AVANT
		// de lire la prop `replace` du `<Link>`. C'est ici que la navigation se décide.
		router.replace("/produits", PAGE_FADE_NAVIGATION);
	};

	return (
		<div
			data-slot="scroll-fade-container"
			className="scroll-fade-y h-full overflow-x-hidden overflow-y-auto overscroll-contain"
		>
			<div className="space-y-6 p-4">
				{/* Le nuancier — PREMIÈRE section du panneau au repos.
					Quelqu'un qui appuie sur la loupe de la barre du bas ne cherche pas un
					mot : il regarde. Le mur répond avec la seule chose que cette boutique
					possède en propre — ses couleurs. Le champ reste épinglé au-dessus (il
					garde son `autoFocus`) : ce qui change, c'est ce que le panneau MONTRE,
					pas l'ordre des affordances. Direction « C — Le nuancier », 2026-08-05. */}
				{colors.length > 0 && (
					<section aria-labelledby="colors-heading">
						<div className="mb-3 flex items-center">
							{/* `h3` et non `h2` : `DialogTitle` (« Rechercher ») rend déjà un `<h2>`
								chez Base UI. Au même niveau, les quatre sections du panneau étaient
								SŒURS du titre du dialog au lieu d'en être filles. Audit UI/UX
								2026-08-05 (P3-8). */}
							<h3
								id="colors-heading"
								// Encre pleine, et non `--muted-foreground` comme avant sur les trois
								// titres du panneau : ils étaient au MÊME gris que ce qu'ils titrent —
								// la police d'affichage employée, puis désaturée au niveau de la
								// légende. Un titre doit peser plus que son contenu. Audit DA
								// 2026-08-05 (P2-5).
								className="font-display text-base font-medium tracking-wide"
							>
								Par couleur
							</h3>
						</div>
						<ColorWall colors={colors} onSelect={handleNavigateClose} />
					</section>
				)}

				{/* Recent Searches */}
				{searches.length > 0 && (
					<section aria-labelledby="recent-searches-heading">
						<div className="mb-3 flex items-center justify-between">
							<h3
								id="recent-searches-heading"
								// Encre pleine — cf. le commentaire du titre « Par couleur ».
								className="font-display text-base font-medium tracking-wide"
							>
								Recherches récentes
							</h3>
							{/* Confirmation — le geste supprime TOUT, d'un tap, sans retour
								arrière : `useRecentSearches` n'expose aucun chemin de
								restauration, une annulation demanderait une Server Action de
								plus. `ConfirmDialog` est le SSOT du dépôt pour ce cas,
								et le seul des quatre overlays qui NE BASCULE PAS en drawer sous
								`md` — une confirmation ne se prend pas dans une feuille
								éphémère. Audit DA 2026-08-05 (P3-6). */}
							<Button
								variant="ghost"
								size="sm"
								disabled={isPending}
								onClick={() => setIsClearConfirmOpen(true)}
								className="hover:text-destructive -mr-2 h-11 touch-manipulation px-3 text-sm sm:h-9"
								aria-label="Effacer toutes les recherches récentes"
							>
								Effacer
							</Button>
							<ConfirmDialog
								open={isClearConfirmOpen}
								onClose={() => setIsClearConfirmOpen(false)}
								onConfirm={() => {
									onClearSearches();
									setIsClearConfirmOpen(false);
								}}
								tone="destructive"
								confirmDisabled={isPending}
								title="Effacer tes recherches récentes\u00a0?"
								confirmLabel="Effacer"
								description={
									searches.length === 1
										? "Le seul terme enregistré sera supprimé. C'est sans retour."
										: `Les ${searches.length} termes enregistrés seront supprimés. C'est sans retour.`
								}
							/>
						</div>
						<ul className="space-y-1">
							<AnimatePresence mode="popLayout">
								{searches.map((term) => (
									/* Pas de `height`/`marginBottom` animés (relayout par frame) : `layout` +
									   `mode="popLayout"` retirent l'item du flux et font remonter ses voisins
									   via transform. */
									<m.li
										key={term}
										layout
										initial={{ opacity: 1 }}
										exit={{ opacity: 0, scale: 0.97 }}
										transition={{ duration: MOTION_CONFIG.duration.normal }}
										className="group/item flex items-center gap-1"
									>
										<Tap className="min-w-0 flex-1" scale={0.97}>
											<button
												type="button"
												onClick={() => onRecentSearch(term)}
												disabled={isPending}
												data-active={undefined}
												// Pas de `role="option"` : en idle le conteneur n'est PAS un listbox
												// (F3) — une option y serait orpheline. `data-qs-option` suffit à la
												// navigation, qui déplace ici le focus DOM réel, annoncé nativement.
												data-qs-option=""
												// Reached via arrow keys, not Tab (combobox pattern).
												tabIndex={-1}
												className={cn(
													"flex w-full items-center gap-3 rounded-xl p-3 text-left font-medium transition-colors",
													"hover:bg-muted touch-manipulation",
													"focus-ring",
													"disabled:opacity-50",
													"data-[active=true]:bg-muted",
												)}
											>
												<MagnifyingGlassIcon
													className="text-muted-foreground size-4 shrink-0"
													aria-hidden="true"
												/>
												<span className="flex-1 truncate">{term}</span>
											</button>
										</Tap>
										<button
											type="button"
											onClick={() => onRemoveSearch(term)}
											disabled={isPending}
											className={cn(
												"flex size-11 shrink-0 items-center justify-center rounded-xl",
												"text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
												"touch-manipulation transition-[color,background-color,opacity]",
												// `focus-ring`, et non un `ring-ring` nu : `--ring` reste pastel À
												// DESSEIN (≈1,6:1, cf. globals.css § ROSE PROFOND) — c'est
												// l'`outline: 2px var(--foreground)` de l'utilitaire qui porte
												// l'état, à 19,5:1. Ce call site l'éteignait explicitement
												// (`focus-visible:outline-none`), laissant l'anneau pastel seul
												// indicateur : sous les 3:1 de WCAG 1.4.11.
												"focus-ring",
												"disabled:opacity-50",
												// ⚠️ Masquage gaté sur la CAPACITÉ DE SURVOL, pas sur la largeur.
												// C'était `md:opacity-0 md:group-hover/item:opacity-100` : un iPad
												// (≥ 768 px, `hover: none`) tombait dans le masquage sans jamais
												// pouvoir déclencher la révélation — le bouton restait à
												// `opacity: 0`, tout en restant cliquable et focusable. Défaut
												// documenté dans CLAUDE.md § Conventions UI, déjà rencontré sur
												// `ProductCard` (2026-08-03). Même forme que
												// `sortable-media-item.tsx` : hors `can-hover`, le bouton est
												// simplement TOUJOURS visible, donc aucune règle de révélation
												// n'est nécessaire là — et aucune n'est enterrée sous le gate.
												"opacity-100",
												"can-hover:opacity-0",
												"can-hover:group-focus-within/item:opacity-100",
												"can-hover:group-hover/item:opacity-100",
												"can-hover:focus-visible:opacity-100",
											)}
											aria-label={`Supprimer "${term}"`}
										>
											<XIcon className="size-5 sm:size-4" />
										</button>
									</m.li>
								))}
							</AnimatePresence>
						</ul>
					</section>
				)}

				{/* Collections */}
				{collections.length > 0 && (
					<section aria-labelledby="collections-heading">
						<div className="mb-3 flex items-center">
							<h3
								id="collections-heading"
								// Encre pleine — cf. le commentaire du titre « Par couleur ».
								className="font-display text-base font-medium tracking-wide"
							>
								Collections
							</h3>
						</div>
						<Stagger
							as="ul"
							itemAs="li"
							className="grid grid-cols-2 gap-2"
							stagger={0.02}
							delay={0.03}
							y={8}
						>
							{collections.map((collection) => (
								<CollectionCard
									key={collection.slug}
									collection={collection}
									onSelect={handleNavigateClose}
								/>
							))}
						</Stagger>
						<div className="mt-3 text-center">
							<Link
								href="/collections"
								// `replace` : consomme l'entrée d'historique du dialog (CLAUDE.md § Overlays).
								replace
								onClick={handleViewAllCollections}
								// `focus-ring` — cf. le commentaire du × de suppression : un `ring-ring`
								// nu avec `outline-none` laisse le pastel seul indicateur (≈1,6:1).
								className="text-muted-foreground hover:text-foreground focus-ring inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors sm:min-h-9"
							>
								Voir toutes les collections
								<CaretRightIcon className="size-4" aria-hidden="true" />
							</Link>
						</div>
					</section>
				)}

				{/* Empty State */}
				{!hasContent && (
					<Stagger className="py-8 text-center" role="status" stagger={0.03} delay={0.05} y={10}>
						<MagnifyingGlassIcon
							className="text-muted-foreground/20 mx-auto mb-4 size-10"
							aria-hidden="true"
						/>
						<p className="text-muted-foreground text-sm">Trouve ton prochain bijou</p>
					</Stagger>
				)}

				{/* Accès catalogue — rendu en PERMANENCE, pas seulement dans la branche
					`!hasContent` (quasi morte en production : les collections sont
					toujours chargées).
					⚠️ Sa justification d'origine (« seul chemin mobile vers le catalogue »)
					est TOMBÉE le 2026-08-04 : la barre du bas a gagné un onglet
					« Créations » → /produits. Ce qui la remplace : une fois le panneau
					parcouru sans rien trouver, ce bouton est la sortie de SECOURS in situ —
					refermer le dialog pour viser un onglet est un détour, pas un chemin. */}
				<div className="text-center">
					{/* `replace` : consomme l'entrée d'historique du dialog (CLAUDE.md § Overlays). */}
					<Button
						render={<Link href="/produits" replace onClick={handleViewAllProducts} />}
						variant="outline"
						className="min-h-11 touch-manipulation sm:min-h-10"
					>
						Voir tous les produits
					</Button>
				</div>
			</div>
		</div>
	);
}
