import { Fade, HandDrawnUnderline } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { SectionTitle } from "@/shared/components/section-title";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";
import { CursorGlow } from "@/modules/products/components/cursor-glow";
import { ProductCard } from "@/modules/products/components/product-card";
import type { GetProductsReturn } from "@/modules/products/data/get-products";
import { LatestCreationsHapticBridge } from "./latest-creations-haptic-bridge";
import { SectionCtaLink } from "./section-cta-link";

export async function LatestCreations({
	productsPromise,
}: {
	productsPromise: Promise<GetProductsReturn>;
}) {
	const { products } = await productsPromise;

	if (products.length === 0) {
		return null;
	}

	return (
		<section
			id="latest-creations"
			className={`bg-background relative overflow-hidden ${SECTION_SPACING.section}`}
			aria-labelledby="latest-creations-title"
			aria-describedby="latest-creations-subtitle"
		>
			<div className={`relative ${CONTAINER_CLASS}`}>
				{/* Baymard UX: Full scope labels - "Nouveaux bijoux" au lieu de "Nouveautés" */}
				<header className="mb-10 text-center lg:mb-14">
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
						<SectionTitle id="latest-creations-title">Nouvelles créations</SectionTitle>
						<HandDrawnUnderline
							color="var(--secondary)"
							delay={MOTION_CONFIG.section.underline.delay}
							className="mx-auto mt-2"
						/>
					</Fade>
					<p
						id="latest-creations-subtitle"
						className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg/8 tracking-normal"
					>
						Tout juste sorties de l'atelier et réalisées avec amour !
					</p>
				</header>
				<LatestCreationsHapticBridge>
					<div className="mb-6 grid grid-cols-2 gap-4 sm:mb-8 sm:gap-6 lg:mb-12 lg:grid-cols-4 lg:gap-8">
						{products.map((product, index) => (
							<div key={product.id} data-latest-haptic="card" className="contents">
								<CursorGlow>
									<ProductCard product={product} index={index} sectionId="latest" />
								</CursorGlow>
							</div>
						))}
					</div>
				</LatestCreationsHapticBridge>
				<Fade
					y={MOTION_CONFIG.section.cta.y}
					delay={MOTION_CONFIG.section.cta.delay}
					duration={MOTION_CONFIG.section.cta.duration}
					inView
					once
					className="text-center"
				>
					<SectionCtaLink
						href="/produits?sortBy=created-descending"
						hapticPattern="selection"
						aria-describedby="latest-creations-cta-description"
					>
						Voir tous les nouveaux bijoux
					</SectionCtaLink>
					<span id="latest-creations-cta-description" className="sr-only">
						Découvrir tous les bijoux récemment créés dans la boutique Synclune
					</span>
				</Fade>
			</div>
		</section>
	);
}
