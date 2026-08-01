import "./latest-creations.css";

import type { CSSProperties } from "react";

import { Fade } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";
import { CursorGlow } from "@/modules/products/components/cursor-glow";
import { ProductCard } from "@/modules/products/components/product-card";
import type { GetProductsReturn } from "@/modules/products/data/get-products";
import { SectionCtaLink } from "./section-cta-link";
import { SectionHalo } from "./section-halo";
import { SectionHeader } from "./section-header";

export async function LatestCreations({
	productsPromise,
}: {
	productsPromise: Promise<GetProductsReturn>;
}) {
	const { products } = await productsPromise;
	const isEmpty = products.length === 0;

	return (
		<section
			id="latest-creations"
			data-accent="rose"
			className={`bg-background relative overflow-hidden ${SECTION_SPACING.section}`}
			aria-labelledby="latest-creations-title"
			aria-describedby="latest-creations-subtitle"
			style={{ viewTransitionName: "latest-creations" }}
		>
			<SectionHalo />
			<div className={`relative ${CONTAINER_CLASS}`}>
				{/* Baymard UX: Full scope labels — h2 "Nouvelles créations" reste explicite (vs "Nouveautés" générique).
				    inView=false : section near-fold, le header fade au montage (pas au scroll). */}
				<SectionHeader
					titleId="latest-creations-title"
					subtitleId="latest-creations-subtitle"
					inView={false}
					title={
						<>
							Nouvelles <em className="font-medium italic">créations</em>
						</>
					}
					subtitle={
						isEmpty
							? "De nouveaux bijoux arrivent très bientôt dans l'atelier."
							: "Tout juste sorties de l'atelier et réalisées avec amour !"
					}
				/>
				{isEmpty ? (
					<Fade
						y={MOTION_CONFIG.section.cta.y}
						delay={MOTION_CONFIG.section.cta.delay}
						duration={MOTION_CONFIG.section.cta.duration}
						inView
						once
						className="mb-6 text-center sm:mb-8 lg:mb-12"
					>
						<p className="text-muted-foreground mx-auto max-w-xl text-base">
							En attendant, parcours toute la boutique pour découvrir les pièces déjà disponibles.
						</p>
					</Fade>
				) : (
					/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none */
					<ul
						role="list"
						className="mb-6 grid grid-cols-2 gap-4 sm:mb-8 sm:gap-6 md:grid-cols-4 lg:mb-12 lg:gap-8"
					>
						{products.map((product, index) => (
							<li
								key={product.id}
								className="card-enter-scroll"
								style={{ "--card-index": index } as CSSProperties}
							>
								<CursorGlow>
									<ProductCard
										product={product}
										index={index}
										sectionId="latest"
										// Ce premier card est l'image LCP de la page (le hero est
										// purement typographique) : preload actif (`<link rel="preload">`
										// hissé par React 19), et `disablePreload` sur les suivants pour
										// ne pas multiplier les preloads concurrents sur 4G.
										disablePreload={index !== 0}
										showNewBadge
									/>
								</CursorGlow>
							</li>
						))}
					</ul>
				)}
				<Fade
					y={MOTION_CONFIG.section.cta.y}
					delay={MOTION_CONFIG.section.cta.delay}
					duration={MOTION_CONFIG.section.cta.duration}
					inView
					once
					className="text-center"
				>
					{/* Seul CTA « default » (rose plein) de la page hors hero — hiérarchie d'incitation. */}
					<SectionCtaLink
						href={isEmpty ? "/produits" : "/produits?sortBy=created-descending"}
						variant="default"
						aria-describedby="latest-creations-cta-description"
					>
						{isEmpty ? "Voir tous les bijoux disponibles" : "Voir tous les nouveaux bijoux"}
					</SectionCtaLink>
					<span id="latest-creations-cta-description" className="sr-only">
						{isEmpty
							? "Parcourir le catalogue des bijoux actuellement disponibles dans la boutique Synclune"
							: "Découvrir tous les bijoux récemment créés dans la boutique Synclune"}
					</span>
				</Fade>
			</div>
		</section>
	);
}
