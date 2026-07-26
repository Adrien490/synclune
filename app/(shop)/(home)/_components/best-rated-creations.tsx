import "./latest-creations.css";

import type { CSSProperties } from "react";

import { Star } from "lucide-react";

import { Fade, HandDrawnAccent } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";
import { CursorGlow } from "@/modules/products/components/cursor-glow";
import { ProductCard } from "@/modules/products/components/product-card";
import type { GetProductsReturn } from "@/modules/products/data/get-products";
import { SectionCtaLink } from "./section-cta-link";
import { SectionHalo } from "./section-halo";
import { SectionHeader } from "./section-header";

/**
 * Note moyenne minimale (sur 5) pour qu'un produit soit considéré « bien noté »
 * et éligible au rail. Doit rester aligné avec le `ratingMin` passé à
 * `getProducts` dans `page.tsx`.
 */
export const BEST_RATED_MIN_RATING = 4;

/**
 * Nombre minimum de produits réellement notés requis pour afficher le rail.
 * En dessous (catalogue jeune / pré-lancement), la section se masque
 * entièrement — pas de rail vide, ni de quasi-doublon de « Nouvelles créations ».
 */
export const BEST_RATED_MIN_PRODUCTS = 2;

/** Nombre de cards recevant un badge de rang (« 1 », « 2 »). */
const RANKED_BADGE_COUNT = 2;

/**
 * Rail « Les mieux notées » — preuve sociale par la note.
 *
 * Composant serveur alimenté par un fetch dédié (trié par note décroissante,
 * filtré sur `ratingMin = BEST_RATED_MIN_RATING`). **S'auto-masque**
 * (`return null`) quand il n'y a pas assez de produits réellement notés
 * (`totalCount > 0`). Rendu sous `<Suspense fallback={null}>` côté page : pas
 * de skeleton qui flasherait puis disparaîtrait (CLS) dans le cas courant
 * pré-lancement, et aucun couplage avec le LCP du hero.
 *
 * Différencié de « Nouvelles créations » (rail jumeau historique) : bande plus
 * courte (`SECTION_SPACING.default`), header aligné à gauche avec CTA desktop
 * en vis-à-vis, badges de rang or (« sun », accent de section) sur le podium.
 *
 * Les images sont volontairement lazy (`disablePreload`) : ce rail est sous la
 * ligne de flottaison, jamais candidat LCP.
 */
export async function BestRatedCreations({
	productsPromise,
}: {
	productsPromise: Promise<GetProductsReturn>;
}) {
	const { products } = await productsPromise;

	// Garde-fou en plus du `ratingMin` serveur : ne garder que les produits
	// réellement notés (un produit non noté ne doit jamais remonter ici).
	const ratedProducts = products.filter((p) => (p.reviewStats?.totalCount ?? 0) > 0);

	if (ratedProducts.length < BEST_RATED_MIN_PRODUCTS) return null;

	const cta = (
		<SectionCtaLink href="/produits?sortBy=rating-descending" variant="link">
			Toutes les mieux notées
		</SectionCtaLink>
	);

	return (
		<section
			id="best-rated-creations"
			data-accent="sun"
			className={`bg-background relative overflow-hidden ${SECTION_SPACING.default}`}
			aria-labelledby="best-rated-creations-title"
			aria-describedby="best-rated-creations-subtitle"
			style={{ viewTransitionName: "best-rated-creations" }}
		>
			<SectionHalo />
			<div className={`relative ${CONTAINER_CLASS}`}>
				<SectionHeader
					titleId="best-rated-creations-title"
					subtitleId="best-rated-creations-subtitle"
					align="left"
					title={
						<span className="relative inline-block">
							Les mieux notées
							<HandDrawnAccent
								variant="star"
								width={26}
								height={26}
								color="var(--section-accent, var(--primary))"
								className="absolute -top-4 -right-7 sm:-top-5 sm:-right-9"
							/>
						</span>
					}
					subtitle={
						<>
							Les créations préférées de notre clientèle, plébiscitées par vos avis.{" "}
							<span className="text-foreground mt-2 inline-flex items-center gap-1.5 rounded-full bg-(--section-soft) px-3 py-1 text-sm">
								<Star
									className="size-3.5 fill-(--star-filled) text-(--star-filled)"
									aria-hidden="true"
								/>
								Notées {BEST_RATED_MIN_RATING} étoiles et plus
							</span>
						</>
					}
					cta={cta}
				/>
				{/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none */}
				<ul
					role="list"
					className="mb-6 grid grid-cols-2 gap-4 sm:mb-8 sm:gap-6 md:grid-cols-4 lg:mb-0 lg:gap-8"
				>
					{ratedProducts.map((product, index) => (
						<li
							key={product.id}
							className="card-enter-scroll relative"
							style={{ "--card-index": index } as CSSProperties}
						>
							{index < RANKED_BADGE_COUNT && (
								<span
									aria-hidden="true"
									className="text-foreground font-display absolute -top-2 -left-2 z-30 flex size-8 items-center justify-center rounded-full bg-(--section-accent) text-sm font-medium shadow-md"
								>
									{index + 1}
								</span>
							)}
							<CursorGlow>
								<ProductCard
									product={product}
									index={index}
									sectionId="best-rated"
									// Rail sous la ligne de flottaison : jamais candidat LCP → images lazy
									// (`disablePreload` force `isAboveFold = false` dans ProductCard).
									disablePreload
								/>
							</CursorGlow>
						</li>
					))}
				</ul>
				{/* CTA mobile/tablette — le slot header ne s'affiche qu'à partir de lg. */}
				<Fade
					y={MOTION_CONFIG.section.cta.y}
					delay={MOTION_CONFIG.section.cta.delay}
					duration={MOTION_CONFIG.section.cta.duration}
					inView
					once
					className="text-center lg:hidden"
				>
					{cta}
				</Fade>
			</div>
		</section>
	);
}
