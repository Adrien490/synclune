import { PageHeader } from "@/shared/components/page-header";
import { DecorativeHalo } from "@/shared/components/animations/decorative-halo";
import { GlitterSparkles } from "@/shared/components/animations/glitter-sparkles";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { cacheLife, cacheTag } from "next/cache";
import { CustomizationForm } from "@/modules/customizations/components/customization-form";
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

/**
 * Page de personnalisation publique avec cache
 * Affiche le formulaire de demande de personnalisation
 *
 * Utilise "use cache" car le contenu est identique pour tous les visiteurs.
 * Le formulaire ContactForm (client component) gère l'interactivité côté client.
 */
export default async function CustomizationPage() {
	"use cache";
	cacheLife("days");
	cacheTag("customization-page");

	// Récupérer les types de bijoux pour le formulaire
	const { productTypes } = await getProductTypes({ perPage: 100 });

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
			<section className="bg-background py-8 sm:py-10 lg:py-12 relative z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					{/* Formulaire de personnalisation */}
					<CustomizationForm productTypes={productTypes} />
				</div>
			</section>
		</div>
	);
}
