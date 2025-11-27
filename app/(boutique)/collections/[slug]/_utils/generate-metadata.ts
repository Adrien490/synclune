import { CollectionStatus } from "@/app/generated/prisma/client";
import { getCollectionBySlug } from "@/modules/collections/data/get-collection";
import type { Metadata } from "next";

export async function generateCollectionMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const collection = await getCollectionBySlug({ slug });

	// Vérifier que la collection existe et est publiée
	if (!collection || collection.status !== CollectionStatus.PUBLIC) {
		return {
			title: "Collection non trouvée - Synclune",
			description: "Cette collection n'existe pas ou n'est plus disponible.",
		};
	}

	const title = `${collection.name} - Collections Synclune | Bijoux artisanaux faits main`;
	const description =
		collection.description ||
		`Découvrez la collection ${collection.name} de Synclune - Des bijoux colorés et originaux faits main avec amour.`;
	const canonicalUrl = `/collections/${slug}`;
	const fullUrl = `https://synclune.fr/collections/${slug}`;

	return {
		title,
		description,
		keywords: `collection ${collection.name.toLowerCase()}, bijoux artisanaux, ${collection.name.toLowerCase()} fait main, collection bijoux`,
		// Balise canonical pour pages collections
		alternates: {
			canonical: canonicalUrl,
		},
		openGraph: {
			title,
			description,
			url: fullUrl,
			type: "website",
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
		},
	};
}
