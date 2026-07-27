import { CollectionStatus } from "@/app/generated/prisma/client";
import { PageHeader } from "@/shared/components/page-header";
import { ParticleBackground } from "@/shared/components/animations";
import { CollectionGrid } from "@/modules/collections/components/collection-grid";
import { CollectionGridSkeleton } from "@/modules/collections/components/collection-grid-skeleton";
import { getCollections } from "@/modules/collections/data/get-collections";
import { GET_COLLECTIONS_DEFAULT_PER_PAGE } from "@/modules/collections/data/get-collections";
import { getFirstParam } from "@/shared/utils/params";
import { Suspense } from "react";
import type { Metadata } from "next";
import { SITE_URL } from "@/shared/constants/seo-config";

type CollectionsPageProps = {
	searchParams: Promise<{
		cursor?: string;
		direction?: string;
		perPage?: string;
	}>;
};

export async function generateMetadata({ searchParams }: CollectionsPageProps): Promise<Metadata> {
	const params = await searchParams;

	// Pages cursor (`?cursor=...`) = duplicate content vs canonical `/collections`
	// → noindex pour préserver le crawl budget (parité avec /produits, P2-2).
	// Le `follow` laisse Google suivre les liens vers les collections.
	const isPaginated = !!getFirstParam(params.cursor);

	return {
		title: "Collections de bijoux artisanaux | Synclune",
		description:
			"Explorez toutes les collections de bijoux colorés et originaux faits main. Chaque collection a son univers : Pokémon, Van Gogh, et bien d'autres !",
		keywords:
			"collections bijoux, bijoux artisanaux, collections thématiques, bijoux faits main, créations uniques, bijoux pokemon, bijoux van gogh",
		alternates: {
			canonical: "/collections",
		},
		robots: isPaginated ? { index: false, follow: true } : undefined,
		openGraph: {
			title: "Collections de bijoux artisanaux | Synclune",
			description:
				"Explorez toutes les collections de bijoux colorés faits main. Chaque collection a son univers unique !",
			url: `${SITE_URL}/collections`,
			type: "website",
			images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
		},
		twitter: {
			card: "summary_large_image",
			title: "Les Collections | Synclune",
			description:
				"Collections de bijoux colorés faits main. Univers Pokémon, Van Gogh et bien d'autres !",
		},
	};
}

export default async function CollectionsPage({ searchParams }: CollectionsPageProps) {
	// Note: Pas de "use cache" ici car la page utilise searchParams (pagination)
	// Le cache est géré au niveau de fetchCollections() qui utilise déjà "use cache"

	const params = await searchParams;

	// Récupérer les collections avec filtres
	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) ?? "forward") as "forward" | "backward";
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
		<div className="relative min-h-dvh">
			{/* Background décoratif - Particules pour ambiance bijoux */}
			<ParticleBackground className="fixed inset-0 z-0" />

			<PageHeader
				title="Les collections"
				breadcrumbs={[{ label: "Collections", href: "/collections" }]}
				className="hidden sm:block"
				accent="underline"
			/>

			{/* Section principale avec catalogue */}
			<section className="bg-background relative z-10 pt-[calc(var(--navbar-height)+1rem)] pb-12 sm:pt-4 lg:pt-6 lg:pb-16">
				<div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
					{/* H1 mobile sr-only — le PageHeader ci-dessus est `hidden sm:block`, donc en
					    dessous de 40rem cette page n'avait AUCUN h1 : la première en-tête était
					    le h2 d'une carte de collection (WCAG 2.4.6 / 1.3.1). Même repli que
					    `product-catalog.tsx`, qui l'avait et dont /collections avait été oubliée. */}
					<h1 className="sr-only sm:hidden" data-testid="collections-mobile-title">
						Les collections
					</h1>

					<Suspense fallback={<CollectionGridSkeleton />}>
						<CollectionGrid collectionsPromise={collectionsPromise} perPage={perPage} />
					</Suspense>
				</div>
			</section>
		</div>
	);
}
