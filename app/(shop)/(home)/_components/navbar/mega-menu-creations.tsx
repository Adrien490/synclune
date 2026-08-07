"use client";

import { useId } from "react";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItemChild, MegaMenuProduct } from "@/shared/constants/navigation";
import { NavigationMenuLink } from "@/shared/components/ui/navigation-menu";
import { LoadingIndicator } from "@/shared/components/navigation";
import { HandDrawnUnderline } from "@/shared/components/animations/hand-drawn-accent";
import { HAND_DRAWN_STROKES } from "@/shared/components/hand-drawn/constants";
import { CollectionImagesGrid } from "@/modules/collections/components/collection-images-grid";
import { formatEuro } from "@/shared/utils/format-euro";
import { ROUTES } from "@/shared/constants/urls";
import { cn } from "@/shared/utils/cn";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { MegaMenuColumn } from "./mega-menu-column";

interface MegaMenuCreationsProps {
	productTypes?: NavItemChild[];
	featuredProducts?: MegaMenuProduct[];
	/** Collection vedette : fallback éditorial du rail droit quand aucune nouveauté n'est dispo. */
	spotlightCollection?: NavItemChild;
}

/**
 * Rail droit du panneau. Passé de 360px à 15rem avec le panneau ancré : les
 * vignettes carrées côte à côte devenaient minuscules dans cette largeur, d'où
 * le passage à des lignes compactes (vignette + libellé), qui logent les deux
 * nouveautés sans allonger le panneau.
 */
const RAIL_WIDTH = "w-60";

/**
 * Tirages du rail Nouveautés (« La boîte à perles », artifact 2026-08-05) :
 * inclinaison alternée par index, classes LITTÉRALES. Le tilt est une pose
 * STATIQUE (pas un mouvement), donc pas de `motion-safe:`.
 */
const TIRAGE_TILT = ["-rotate-1", "rotate-[0.8deg]"] as const;

export function MegaMenuCreations({
	productTypes,
	featuredProducts,
	spotlightCollection,
}: MegaMenuCreationsProps) {
	const regionHeadingId = useId();
	const pathname = usePathname();

	if (!productTypes || productTypes.length === 0) {
		return null;
	}

	const hasProducts = !!(featuredProducts && featuredProducts.length > 0);
	// Fallback éditorial : si pas de nouveautés mais une collection vedette avec images,
	// on remplit le rail droit pour éviter un panneau à moitié vide (F1).
	const spotlightImages = spotlightCollection?.images ?? [];
	const hasSpotlight = !hasProducts && spotlightImages.length > 0;
	const hasRail = hasProducts || hasSpotlight;

	return (
		// Le panneau porte sa propre largeur (cf. `DesktopNav`) : 46rem avec le rail,
		// nettement moins sans lui — sinon les catégories s'étirent dans le vide.
		// `data-accent="rose"` : le panneau est portalisé hors du <header>, il
		// n'hérite donc pas de l'accent de salle posé par navbar-wrapper — il pose
		// le SIEN (même SSOT navbar-section.ts, passée au mono-rose le 2026-08-06 :
		// c'était « lavande » quand chaque salle avait sa couleur). Consommé par
		// les lavages du CTA/item actif et par HandDrawnUnderline.
		<div
			role="region"
			aria-labelledby={regionHeadingId}
			data-accent="rose"
			className={cn(
				"px-6 py-5",
				hasRail ? "w-[min(46rem,var(--available-width))]" : "w-[min(28rem,var(--available-width))]",
			)}
		>
			<div className="flex gap-6">
				{/* Left zone: categories */}
				<div className="min-w-0 flex-1">
					{/* h2 VISIBLE (harmonisation avec le panneau Collections — les deux
					    panneaux s'ouvrent sur leur nom, même structure pour un lecteur
					    d'écran). ⚠️ Le nom accessible du landmark doit continuer de
					    matcher /Créations/i (e2e/mega-menu-desktop.spec.ts). */}
					<h2
						id={regionHeadingId}
						className="text-foreground font-display text-sm leading-tight font-medium"
					>
						Créations
					</h2>
					{/* Le trait se dessine au montage du panneau (keepMounted:false →
					    à chaque ouverture), 500 ms ; reduced-motion l'affiche fini. */}
					{/* Width seule (hauteur dérivée — l'ancien 76×12 letterboxait) ;
					    durée et graisse : les défauts de l'échelle. */}
					<HandDrawnUnderline
						width={76}
						strokeWidth={HAND_DRAWN_STROKES.marqueur}
						inView={false}
						className="mt-0.5"
					/>
					<p className="text-muted-foreground font-display mt-1 mb-3 text-xs italic">
						Tout sort du même établi
					</p>
					<MegaMenuColumn items={productTypes} columns={2} />
				</div>

				{/* Right zone: nouveautés (prioritaire) */}
				{hasProducts && (
					// ⚠️ Plus de `role="region"` sur ce rail. Ouvrir ce panneau ajoutait
					// TROIS landmarks à la page (le rail, la colonne de catégories, le
					// conteneur racine) — pour un menu. Les `region` décrivent la structure
					// d'une PAGE ; dans un popup elles saturent la liste de landmarks d'un
					// lecteur d'écran sans rien apporter, le `<h3>` ci-dessous portant déjà
					// la navigation par en-têtes. Un seul landmark subsiste, sur la racine.
					<div className={cn("border-border shrink-0 border-l pl-6", RAIL_WIDTH)}>
						<h3 className="text-foreground font-display text-sm leading-tight font-medium">
							Nouveautés
						</h3>
						<HandDrawnUnderline
							width={64}
							strokeWidth={HAND_DRAWN_STROKES.marqueur}
							inView={false}
							className="mt-0.5"
						/>
						<p className="text-muted-foreground font-display mt-1 mb-3 text-xs italic">
							Les dernières sorties de l&apos;atelier
						</p>
						{/* Deux TIRAGES (« La boîte à perles ») : le vocabulaire des cartes
						    Atelier — cadre blanc, grain, tilt — posé À L'INTÉRIEUR du
						    panneau. ⚠️ Rien ne doit déborder du cadre du popup — les deux
						    rubans qui ont vécu ici (sur le bord du popup, puis sur les
						    tirages) ont été retirés le 2026-08-05. */}
						<div className="grid gap-4 pt-1.5">
							{featuredProducts.map((product, index) => (
								<NavigationMenuLink
									key={product.slug}
									render={<Link href={ROUTES.SHOP.PRODUCT(product.slug)} />}
									className={cn(
										// `relative` : ancre du `LoadingIndicator` en bas du lien.
										"group/product relative block rounded-md p-1",
										"focus-ring",
									)}
								>
									<span
										className={cn(
											"polaroid-paper bg-card relative block rounded-md p-1.5 pb-2 shadow-2xs",
											TIRAGE_TILT[index % TIRAGE_TILT.length],
											"ease-out motion-safe:transition-[translate,box-shadow] motion-safe:duration-[var(--duration-slow)]",
											// Lift décoratif : même renoncement documenté que les
											// cartes du panneau (pas de parité focus exigée, le
											// focus-ring du lien porte l'état).
											"motion-safe:can-hover:group-hover/product:-translate-y-1",
											"can-hover:group-hover/product:shadow-premium-rose",
										)}
									>
										<span className="bg-muted relative block h-24 overflow-hidden rounded-[3px]">
											<Image
												src={product.imageUrl}
												alt=""
												fill
												sizes="200px"
												quality={IMAGE_QUALITY.THUMBNAIL}
												className="object-cover"
												placeholder={product.blurDataUrl ? "blur" : "empty"}
												blurDataURL={product.blurDataUrl ?? undefined}
												aria-hidden="true"
											/>
										</span>
										<span className="mt-1.5 flex items-baseline justify-between gap-2 px-0.5">
											<span className="text-foreground line-clamp-1 min-w-0 text-[0.8125rem] font-medium">
												{product.title}
											</span>
											<span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
												{formatEuro(product.priceInclTax, { compact: true })}
												{product.isNew && (
													<span
														className={cn(
															"rounded-full px-1.5 py-0.5",
															"bg-primary/90 text-primary-foreground",
															"text-[0.625rem] leading-none font-medium tracking-wide",
														)}
													>
														Nouveau
													</span>
												)}
											</span>
										</span>
									</span>
									<LoadingIndicator />
								</NavigationMenuLink>
							))}
						</div>
					</div>
				)}

				{/* Right zone fallback: spotlight collection (quand pas de nouveautés) */}
				{hasSpotlight && spotlightCollection && (
					// Pas de `role="region"` ici non plus — cf. le rail « Nouveautés ».
					<div className={cn("border-border shrink-0 border-l pl-6", RAIL_WIDTH)}>
						<h3 className="text-foreground font-display text-sm leading-tight font-medium">
							À découvrir
						</h3>
						<HandDrawnUnderline
							width={64}
							strokeWidth={HAND_DRAWN_STROKES.marqueur}
							inView={false}
							className="mt-0.5"
						/>
						<p className="text-muted-foreground font-display mt-1 mb-3 text-xs italic">
							Une collection à explorer
						</p>
						<NavigationMenuLink
							render={
								<Link
									href={spotlightCollection.href}
									aria-current={pathname === spotlightCollection.href ? "page" : undefined}
								/>
							}
							className={cn(
								"group/spotlight relative block rounded-lg p-1.5",
								"ease-out motion-safe:transition-colors motion-safe:duration-[var(--duration-slow)]",
								"hover:bg-accent/50",
								"focus-ring",
							)}
						>
							<div
								className={cn(
									"overflow-hidden rounded-lg",
									"ease-out motion-safe:transition-[transform,box-shadow] motion-safe:duration-[var(--duration-slow)]",
									"motion-safe:can-hover:group-hover/spotlight:-translate-y-0.5",
									"can-hover:group-hover/spotlight:shadow-premium-rose",
								)}
							>
								<CollectionImagesGrid images={spotlightImages} variant="compact" />
							</div>
							<div className="mt-2 min-w-0 px-0.5">
								<p className="text-foreground line-clamp-1 text-sm font-medium">
									{spotlightCollection.label}
								</p>
								{/* ⚠️ Le rose PROFOND, jamais le pastel. `--primary` vaut **1,60:1**
								    sur `--popover` (mesuré par le harnais de
								    `token-contrast.regression.test.ts`) : sous les 4,5:1 de
								    WCAG 1.4.3, ce CTA n'existait pas à l'œil. Le profond — même
								    teinte 340.78 — donne 5,30:1. Règle du dépôt : `--primary` pour
								    les APLATS, `--color-brand-rose-strong` dès que le rose doit
								    être LU.

								    Le nom de la classe fautive n'est PAS écrit ici, et ce n'est pas
								    de la pudeur : Tailwind v4 scanne les commentaires, donc la
								    citer la maintiendrait dans le bundle — et elle rendrait rouge
								    le scan de `navbar-ink-contrast.regression.test.ts`. */}
								<span className="text-brand-rose-strong mt-0.5 inline-flex items-center gap-1 text-xs font-medium">
									Découvrir la collection
									<ArrowRightIcon className="size-3" aria-hidden="true" />
								</span>
							</div>
							<LoadingIndicator />
						</NavigationMenuLink>
					</div>
				)}
			</div>
		</div>
	);
}
