import { Fade, HandDrawnUnderline } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { Button } from "@/shared/components/ui/button";
import { SectionTitle } from "@/shared/components/section-title";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { CursorGlow } from "@/modules/products/components/cursor-glow";
import { ProductCard } from "@/modules/products/components/product-card";
import { type GetProductsReturn } from "@/modules/products/data/get-products";
import Link from "next/link";
import { use } from "react";

interface LatestCreationsProps {
	productsPromise: Promise<GetProductsReturn>;
}

/**
 * Latest Creations section - Grid of most recent jewelry.
 *
 * Suspense boundary is in page.tsx — this component calls use() directly
 * to unwrap the products promise. Returns null if the DB is empty.
 */
export function LatestCreations({ productsPromise }: LatestCreationsProps) {
	const { products } = use(productsPromise);

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
			<div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Baymard UX: Full scope labels - "Nouveaux bijoux" au lieu de "Nouveautés" */}
				<header className="mb-10 text-center lg:mb-14">
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
						<SectionTitle id="latest-creations-title">Nouvelles créations</SectionTitle>
						<HandDrawnUnderline color="var(--secondary)" delay={0.15} className="mx-auto mt-2" />
					</Fade>
					<p
						id="latest-creations-subtitle"
						className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg/8 tracking-normal"
					>
						Tout juste sorties de l'atelier et réalisées avec amour !
					</p>
				</header>
				<div className="mb-6 grid grid-cols-2 gap-4 sm:mb-8 sm:gap-6 lg:mb-12 lg:grid-cols-4 lg:gap-8">
					{products.map((product, index) => (
						<CursorGlow key={product.id}>
							<div className="scroll-reveal-card">
								<ProductCard product={product} index={index} sectionId="latest" />
							</div>
						</CursorGlow>
					))}
				</div>
				<Fade
					y={MOTION_CONFIG.section.cta.y}
					delay={MOTION_CONFIG.section.cta.delay}
					duration={MOTION_CONFIG.section.cta.duration}
					inView
					once
					className="text-center"
				>
					<Button
						asChild
						size="lg"
						variant="outline"
						className="transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
						aria-describedby="latest-creations-cta-description"
					>
						<Link href="/produits?sortBy=created-descending">Voir tous les nouveaux bijoux</Link>
					</Button>
					<span id="latest-creations-cta-description" className="sr-only">
						Découvrir tous les bijoux récemment créés dans la boutique Synclune
					</span>
				</Fade>
			</div>
		</section>
	);
}
