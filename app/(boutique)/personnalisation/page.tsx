import { PageHeader } from "@/shared/components/page-header";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { DecorativeHalo } from "@/shared/components/animations/decorative-halo";
import { GlitterSparkles } from "@/shared/components/animations/glitter-sparkles";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { CustomizationForm } from "@/modules/customizations/components/customization-form";
import { CustomizationSidebar } from "@/modules/customizations/components/customization-sidebar";
import type { Metadata } from "next";
import { SITE_URL } from "@/shared/constants/seo-config";

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
		url: `${SITE_URL}/personnalisation`,
		type: "website",
		images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
	},
};

/**
 * Page de personnalisation publique
 * Affiche le formulaire de demande de personnalisation
 */
export default async function CustomizationPage() {
	const [{ productTypes }, session] = await Promise.all([
		getProductTypes({ perPage: 100, filters: { isActive: true } }),
		getSession(),
	]);

	const userInfo = session?.user
		? {
				firstName: session.user.name.split(" ")[0] ?? "",
				email: session.user.email,
			}
		: undefined;

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
				description="Vous avez une idée de bijou en tête ? Dites-moi tout !"
				breadcrumbs={[{ label: "Personnalisation", href: "/personnalisation" }]}
			/>

			{/* Section principale avec formulaire */}
			<section className={`bg-background ${SECTION_SPACING.compact} relative z-10`}>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col-reverse lg:grid lg:grid-cols-[1fr_380px] lg:gap-12">
						<div className="max-w-xl">
							<CustomizationForm productTypes={productTypes} userInfo={userInfo} />
						</div>
						<CustomizationSidebar />
					</div>
				</div>
			</section>
		</div>
	);
}
