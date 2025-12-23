import { CollectionStatus } from "@/app/generated/prisma/client";
import { PageHeader } from "@/shared/components/page-header";
import { ParticleSystem } from "@/shared/components/animations/particle-system";
import { CollectionGrid } from "@/modules/collections/components/collection-grid";
import { CollectionGridSkeleton } from "@/modules/collections/components/collection-grid-skeleton";
import { getCollections } from "@/modules/collections/data/get-collections";
import { GET_COLLECTIONS_DEFAULT_PER_PAGE } from "@/modules/collections/data/get-collections";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Les Collections - Synclune | Collections de bijoux artisanaux",
	description:
		"Explorez toutes les collections de bijoux colorés et originaux faits main. Chaque collection a son univers : Pokémon, Van Gogh, et bien d'autres !",
	keywords:
		"collections bijoux, bijoux artisanaux, collections thématiques, bijoux faits main, créations uniques, bijoux pokemon, bijoux van gogh",
	alternates: {
		canonical: "/collections",
	},
	openGraph: {
		title: "Les Collections - Synclune | Bijoux artisanaux faits main",
		description:
			"Explorez toutes les collections de bijoux colorés faits main. Chaque collection a son univers unique !",
		url: "https://synclune.fr/collections",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Les Collections | Synclune",
		description:
			"Collections de bijoux colorés faits main à Nantes. Univers Pokémon, Van Gogh et bien d'autres !",
	},
};

type CollectionsPageProps = {
	searchParams: Promise<{
		cursor?: string;
		direction?: string;
		perPage?: string;
	}>;
};

// JSON-LD BreadcrumbList pour SEO
const breadcrumbJsonLd = {
	"@context": "https://schema.org",
	"@type": "BreadcrumbList",
	itemListElement: [
		{
			"@type": "ListItem",
			position: 1,
			name: "Accueil",
			item: "https://synclune.fr",
		},
		{
			"@type": "ListItem",
			position: 2,
			name: "Collections",
			item: "https://synclune.fr/collections",
		},
	],
};

export default async function CollectionsPage({
	searchParams,
}: CollectionsPageProps) {
	// Note: Pas de "use cache" ici car la page utilise searchParams (pagination)
	// Le cache est géré au niveau de fetchCollections() qui utilise déjà "use cache"

	const params = await searchParams;

	// Récupérer les collections avec filtres
	const cursor = typeof params.cursor === "string" ? params.cursor : undefined;
	const direction = (
		typeof params.direction === "string" ? params.direction : "forward"
	) as "forward" | "backward";
	const perPage = Number(params.perPage) || GET_COLLECTIONS_DEFAULT_PER_PAGE;

	// Récupérer les collections (uniquement celles publiées avec des produits)
	const collectionsPromise = getCollections({
		cursor,
		direction,
		perPage,
		sortBy: "name-ascending",
		filters: {
			hasProducts: true,
			status: CollectionStatus.PUBLIC,
		},
	});

	return (
		<div className="min-h-screen relative">
			{/* JSON-LD Structured Data */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
			/>

			{/* Background décoratif - Particules pour ambiance bijoux */}
			<ParticleSystem className="fixed inset-0 z-0" />

			<PageHeader
				title="Les collections"
				breadcrumbs={[{ label: "Collections", href: "/collections" }]}
			/>

			{/* Section principale avec catalogue */}
			<section className="bg-background pt-4 pb-12 lg:pt-6 lg:pb-16 relative z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					<Suspense fallback={<CollectionGridSkeleton />}>
						<CollectionGrid
							collectionsPromise={collectionsPromise}
							perPage={perPage}
						/>
					</Suspense>
				</div>
			</section>
		</div>
	);
}
