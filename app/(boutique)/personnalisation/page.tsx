import { PageHeader } from "@/shared/components/page-header";
import { DecorativeHalo } from "@/shared/components/animations/decorative-halo";
import { GlitterSparkles } from "@/shared/components/animations/glitter-sparkles";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { CustomizationForm } from "@/modules/customizations/components/customization-form";
import { CustomizationSidebar } from "@/modules/customizations/components/customization-sidebar";
import type { Metadata } from "next";
import { SITE_URL } from "@/shared/constants/seo-config";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";

export const metadata: Metadata = {
	title: "Créons votre bijou - Synclune | Bijoux personnalisés",
	description:
		"Une idée de bijou en tête ? Racontez-moi tout ! On va créer quelque chose d'unique.",
	alternates: {
		canonical: "/personnalisation",
	},
	openGraph: {
		title: "Créons votre bijou - Synclune",
		description:
			"Vous avez une idée de bijou personnalisé ? N'hésitez pas à me raconter votre projet, même si c'est pas encore clair.",
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

	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "Service",
		name: "Bijoux personnalisés sur mesure - Synclune",
		description:
			"Service de création de bijoux artisanaux personnalisés. Bagues, colliers, bracelets et boucles d'oreilles faits main sur mesure en France.",
		url: `${SITE_URL}/personnalisation`,
		provider: {
			"@type": "LocalBusiness",
			"@id": `${SITE_URL}/#organization`,
			name: "Synclune",
		},
		areaServed: {
			"@type": "Country",
			name: "France",
		},
		serviceType: "Création de bijoux sur mesure",
		offers: {
			"@type": "Offer",
			availability: "https://schema.org/InStock",
			priceCurrency: "EUR",
			url: `${SITE_URL}/personnalisation`,
		},
	};

	return (
		<div className="relative min-h-screen">
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

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

			{/* Header standard avec breadcrumbs - masqué sur mobile */}
			<PageHeader
				title="Créons votre bijou"
				description="Vous avez une idée de bijou en tête ? Dites-moi tout !"
				breadcrumbs={[{ label: "Personnalisation", href: "/personnalisation" }]}
				className="hidden sm:block"
			/>

			{/* Section principale avec formulaire */}
			<section className="bg-background relative z-10 pt-20 pb-8 sm:py-10 lg:py-12">
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] lg:gap-12">
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
