import { CollectionStatus } from "@/app/generated/prisma/client";
import { CollectionChapters } from "@/modules/collections/components/collection-chapters";
import { CollectionChaptersSkeleton } from "@/modules/collections/components/collection-chapters-skeleton";
import { getCollections } from "@/modules/collections/data/get-collections";
import { GET_COLLECTIONS_DEFAULT_PER_PAGE } from "@/modules/collections/data/get-collections";
import type { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import { BreadcrumbNav } from "@/shared/components/breadcrumb-nav";
import { StorefrontHeading } from "@/shared/components/storefront-heading";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { BRAND } from "@/shared/constants/brand";
import { SITE_URL } from "@/shared/constants/seo-config";
import { getFirstParam } from "@/shared/utils/params";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";
import type { Metadata } from "next";
import { Suspense } from "react";

type CollectionsPageProps = {
	searchParams: Promise<{
		cursor?: string;
		direction?: string;
		perPage?: string;
	}>;
};

/**
 * `BreadcrumbList` page-level — l'ancien émetteur était `PageHeader`, retiré
 * avec le passage au shell « L'étal continue ». L'`ItemList` de la page, lui,
 * reste émis par `CollectionGrid` : 2 scripts, mais UN `BreadcrumbList` et UN
 * `ItemList` par URL (@regression catalogue-single-breadcrumb).
 */
const COLLECTIONS_BREADCRUMB_JSONLD = {
	"@context": "https://schema.org",
	"@type": "BreadcrumbList",
	itemListElement: [
		{ "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
		{ "@type": "ListItem", position: 2, name: "Collections", item: `${SITE_URL}/collections` },
	],
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

/** Compte streamé — seule cette ligne attend la promesse, jamais le `h1`. */
async function CollectionsCount({
	collectionsPromise,
}: {
	collectionsPromise: Promise<GetCollectionsReturn>;
}) {
	const { totalCount } = await collectionsPromise;

	if (totalCount === 0) return null;

	const noun = totalCount > 1 ? "collections" : "collection";

	return (
		<>
			<span className="text-foreground font-semibold tabular-nums">{totalCount}</span> {noun} en
			ligne en ce moment.
		</>
	);
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
			{/* JSON-LD Structured Data — SAFE: serialized via safeJsonLd (no user HTML) */}
			{/* react-doctor-disable-next-line react/no-danger */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: safeJsonLd(COLLECTIONS_BREADCRUMB_JSONLD) }}
			/>

			{/* Shell « L'étal continue » + « Le carnet des séries » (2026-08-05) :
			    le bloc titre vit dans le conteneur standard, mais les CHAPITRES en
			    sortent — leurs voiles `--section-soft` vont bord à bord, et chaque
			    bande re-contraint son contenu (CHAPTER_CONTAINER_CLASSES). */}
			<section className="bg-background relative z-10 pt-[calc(var(--navbar-height-static)+0.75rem)] pb-12 lg:pt-[calc(var(--navbar-height-static)+1.25rem)] lg:pb-16">
				<div className="mx-auto max-w-6xl space-y-5 px-4 pb-5 sm:px-6 lg:px-8">
					<BreadcrumbNav items={[{ label: "Collections", href: "/collections" }]} />

					<StorefrontHeading
						title="Les collections"
						// Chapô masqué sous `sm` par le `<p>` hôte (lot 0, audit 2026-08-05).
						description={`Chaque collection a son univers. Je les imagine comme des petites séries, pièce par pièce, dans mon atelier à ${BRAND.contact.location.city}.`}
						descriptionClassName="hidden sm:block"
						countSlot={
							<Suspense
								fallback={
									<Skeleton as="span" className="inline-block h-4 w-44 rounded align-[-2px]" />
								}
							>
								<CollectionsCount collectionsPromise={collectionsPromise} />
							</Suspense>
						}
						// Pas de listLabel : les bandes de collection portent des h2, la
						// hiérarchie h1 → h2 est déjà séquentielle.
					/>
				</div>

				<Suspense fallback={<CollectionChaptersSkeleton />}>
					<CollectionChapters collectionsPromise={collectionsPromise} />
				</Suspense>
			</section>
		</div>
	);
}
