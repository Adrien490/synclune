import { Fade, Stagger } from "@/shared/components/animations";
import { SectionTitle } from "@/shared/components/section-title";
import { Button } from "@/shared/components/ui/button";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { ProductCard } from "@/modules/products/components/product-card";
import { GetProductsReturn } from "@/modules/products/data/get-products";
import { dancingScript } from "@/shared/styles/fonts";
import { Heart } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { generateCuratedPicksSchema } from "../_utils/generate-curated-picks-schema";

interface CuratedPicksProps {
	productsPromise: Promise<GetProductsReturn>;
	wishlistProductIdsPromise: Promise<Set<string>>;
}

/**
 * Section "Coups de Coeur de Léane" - Sélection curée par la créatrice
 *
 * Remplace Bestsellers: storytelling > data (pas de stats de ventes)
 * - 4 produits sélectionnés manuellement (via slugs hardcodés pour le moment)
 * - Intro personnelle de Léane
 * - Badge "Coup de coeur" sur chaque carte
 * - Design distinct : fond pastel, cadre décoratif
 *
 * Pattern : Server Component qui accepte une Promise pour le streaming
 */
export function CuratedPicks({
	productsPromise,
	wishlistProductIdsPromise,
}: CuratedPicksProps) {
	const { products } = use(productsPromise);
	const wishlistProductIds = use(wishlistProductIdsPromise);

	// Si moins de 2 produits, ne pas afficher la section
	if (products.length < 2) {
		return null;
	}

	// Schema.org ItemList pour SEO
	const curatedPicksSchema = generateCuratedPicksSchema(products);

	return (
		<>
			{/* JSON-LD Schema.org ItemList */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(curatedPicksSchema),
				}}
			/>
			<section
			id="coups-de-coeur"
			className={`relative overflow-hidden bg-muted/20 ${SECTION_SPACING.section}`}
			aria-labelledby="curated-picks-title"
			aria-describedby="curated-picks-subtitle"
		>
			{/* Décorations subtiles */}
			<div
				className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"
				aria-hidden="true"
			/>
			<div
				className="absolute bottom-0 right-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-3xl pointer-events-none"
				aria-hidden="true"
			/>

			<div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header avec intro personnelle */}
				<header className="mb-8 text-center lg:mb-12">
					<Fade y={20} duration={0.6}>
						<SectionTitle id="curated-picks-title">
							Mes coups de coeur
							<Heart
								className="inline-block ml-2 w-8 h-8 text-primary fill-primary"
								aria-hidden="true"
							/>
						</SectionTitle>
						<span className="sr-only">
							Sélection de bijoux artisanaux faits main par Léane, créatrice à Nantes
						</span>
					</Fade>
					<Fade y={10} delay={0.1} duration={0.6}>
						<p
							id="curated-picks-subtitle"
							className="mt-4 text-lg/7 tracking-normal text-muted-foreground max-w-2xl mx-auto"
						>
							Mes créations préférées du moment...
						</p>
					</Fade>
					{/* Citation personnelle */}
					<Fade y={10} delay={0.2} duration={0.6}>
						<p
							className={`${dancingScript.className} mt-3 text-xl sm:text-2xl text-foreground/80 italic`}
						>
							"Celles que je porterais tous les jours !"
						</p>
					</Fade>
				</header>

				{/* Grille de produits */}
				<Stagger
					className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8 mb-6 sm:mb-8 lg:mb-12"
					stagger={0.1}
					y={25}
					inView
					once
				>
					{products.map((product, index) => (
						<div key={product.id} className="relative">
							{/* Badge Coup de coeur */}
							<div
								className="absolute -top-2 -right-2 z-10 px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full shadow-lg backdrop-blur-sm ring-1 ring-black/10 flex items-center gap-1"
								aria-label="Coup de coeur de Léane"
							>
								<Heart className="w-3 h-3 fill-current" aria-hidden="true" />
								<span className="sr-only sm:not-sr-only">Coup de coeur</span>
							</div>
							<ProductCard
								product={product}
								index={index}
								isInWishlist={wishlistProductIds.has(product.id)}
								sectionId="curated"
							/>
						</div>
					))}
				</Stagger>

				{/* CTA */}
				<Fade
					y={15}
					delay={0.3}
					duration={0.5}
					inView
					once
					className="text-center"
				>
					<Button
						asChild
						size="lg"
						variant="secondary"
						className="shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out"
					>
						<Link href="/produits" aria-describedby="curated-picks-cta-description">
							Découvrir tous mes bijoux
						</Link>
					</Button>
					<span id="curated-picks-cta-description" className="sr-only">
						Explorer toute la collection de bijoux artisanaux Synclune
					</span>
				</Fade>
			</div>
		</section>
		</>
	);
}
