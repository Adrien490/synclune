import { ProductStatus } from "@/app/generated/prisma/client";
import { PageHeader } from "@/shared/components/page-header";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { DecorativeHalo } from "@/shared/components/animations/decorative-halo";
import { GlitterSparkles } from "@/shared/components/animations/glitter-sparkles";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getColors } from "@/modules/colors/data/get-colors";
import { getMaterials } from "@/modules/materials/data/get-materials";
import { getProducts } from "@/modules/products/data/get-products";
import { CustomizationForm } from "@/modules/customizations/components/customization-form";
import type { ProductSearchResult } from "@/modules/customizations/types/customization.types";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Créons votre bijou ensemble - Synclune | Bijoux personnalisés à Nantes",
	description:
		"Une idée de bijou en tête ? Racontez-moi tout ! On va créer quelque chose d'unique ensemble.",
	alternates: {
		canonical: "/personnalisation",
	},
	openGraph: {
		title: "Créons votre bijou ensemble - Synclune",
		description:
			"Vous avez une idée de bijou personnalisé ? N'hésitez pas à me raconter votre projet, même si c'est pas encore clair. On affinera ensemble !",
		url: "https://synclune.fr/personnalisation",
		type: "website",
	},
};

interface PageProps {
	searchParams: Promise<{ productSearch?: string }>;
}

/**
 * Page de personnalisation publique
 * Affiche le formulaire de demande de personnalisation
 *
 * La recherche de produits est gérée via les searchParams de l'URL.
 * Les données statiques (couleurs, matériaux, types) sont mises en cache.
 */
export default async function CustomizationPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const productSearch = params.productSearch || "";

	// Récupérer les données pour le formulaire en parallèle
	const [{ productTypes }, { colors }, { materials }, productsResult] = await Promise.all([
		getProductTypes({ perPage: 100 }),
		getColors({ perPage: 100 }),
		getMaterials({ perPage: 100 }),
		productSearch.length >= 3
			? getProducts({
					search: productSearch,
					status: ProductStatus.PUBLIC,
					perPage: 10,
					sortBy: "title-ascending",
					filters: {},
				})
			: Promise.resolve({ products: [], pagination: null }),
	]);

	// Transformer les produits en ProductSearchResult
	const productSearchResults: ProductSearchResult[] = productsResult.products.map((product) => {
		const primaryImage = product.skus[0]?.images[0];
		return {
			id: product.id,
			title: product.title,
			slug: product.slug,
			description: product.description,
			imageUrl: primaryImage?.url ?? null,
			blurDataUrl: primaryImage?.blurDataUrl ?? null,
		};
	});

	return (
		<div className="relative min-h-screen">
			{/* Background décoratif - Effet précieux pour page personnalisation */}
			<GlitterSparkles count={25} sizeRange={[2, 5]} glowIntensity={0.7} />
			<DecorativeHalo
				size="xl"
				variant="mixed"
				className="top-[8%] right-[10%]"
				opacity="light"
				blur="xl"
				animate="pulse"
				animationDelay={0}
			/>
			<DecorativeHalo
				size="lg"
				variant="gold"
				className="bottom-[12%] left-[8%]"
				opacity="light"
				blur="xl"
				animate="pulse"
				animationDelay={2}
			/>

			{/* Header standard avec breadcrumbs */}
			<PageHeader
				title="Créons votre bijou ensemble"
				description="Vous avez une idée de bijou en tête ? Dîtes moi tout !"
				breadcrumbs={[{ label: "Personnalisation", href: "/personnalisation" }]}
			/>

			{/* Section principale avec formulaire */}
			<section className={`bg-background ${SECTION_SPACING.compact} relative z-10`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					{/* Formulaire de personnalisation */}
					<CustomizationForm
						productTypes={productTypes}
						productSearchQuery={productSearch}
						productSearchResults={productSearchResults}
						colors={colors}
						materials={materials}
					/>
				</div>
			</section>
		</div>
	);
}
