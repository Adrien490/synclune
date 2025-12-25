import { PageHeader } from "@/shared/components/page-header";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { DecorativeHalo } from "@/shared/components/animations/decorative-halo";
import { GlitterSparkles } from "@/shared/components/animations/glitter-sparkles";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getRandomTestimonial } from "@/modules/testimonials/data/get-random-testimonial";
import { CustomizationForm } from "@/modules/customizations/components/customization-form";
import { CustomizationSidebar } from "@/modules/customizations/components/customization-sidebar";
import { TestimonialCard } from "@/modules/testimonials/components/testimonial-card";
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
 * Page de personnalisation publique
 * Affiche le formulaire de demande de personnalisation
 */
export default async function CustomizationPage() {
	// Récupérer les données pour le formulaire en parallèle
	const [{ productTypes }, testimonial] = await Promise.all([
		getProductTypes({ perPage: 100, filters: { isActive: true } }),
		getRandomTestimonial(),
	]);

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
					{/* Layout split : formulaire + sidebar sur desktop */}
					<div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-12">
						{/* Formulaire de personnalisation */}
						<div className="max-w-xl">
							<CustomizationForm productTypes={productTypes} />
						</div>

						{/* Sidebar avec témoignage - desktop uniquement */}
						<CustomizationSidebar
							testimonial={testimonial}
							className="hidden lg:block"
						/>
					</div>

					{/* Témoignage mobile - après le formulaire */}
					{testimonial && (
						<div className="lg:hidden mt-12">
							<TestimonialCard testimonial={testimonial} />
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
