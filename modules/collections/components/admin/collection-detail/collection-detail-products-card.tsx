import { PackageIcon } from "@phosphor-icons/react/ssr";

import { CollectionProductsList } from "@/modules/collections/components/admin/collection-products-list";
import { GET_COLLECTION_PRODUCTS_LIMIT } from "@/modules/collections/constants/collection.constants";
import type { GetCollectionReturn } from "@/modules/collections/types/collection.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface CollectionDetailProductsCardProps {
	collection: GetCollectionReturn;
}

export function CollectionDetailProductsCard({ collection }: CollectionDetailProductsCardProps) {
	const totalCount = collection._count.products;
	const displayedCount = collection.products.length;
	const isCapped = totalCount > displayedCount;

	return (
		<Card style={{ viewTransitionName: "collection-edit-products" }}>
			<CardHeader>
				<CardTitle className="flex items-center justify-between gap-2">
					<span className="flex items-center gap-2">
						<PackageIcon className="size-5" aria-hidden="true" />
						Produits
					</span>
					<span className="text-muted-foreground text-sm font-normal">
						{totalCount} produit{totalCount > 1 ? "s" : ""}
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<p className="text-muted-foreground text-sm">
					Cliquez sur l&apos;étoile pour définir le produit vedette. Ce produit sera utilisé comme
					image représentative de la collection.
				</p>
				{isCapped && (
					<p className="border-warning/40 bg-warning/10 text-warning-foreground rounded-md border p-3 text-xs">
						Affichage des {GET_COLLECTION_PRODUCTS_LIMIT} produits les plus récents (sur{" "}
						{totalCount}
						). Pour gérer les autres, utilisez le catalogue.
					</p>
				)}
				<CollectionProductsList
					collectionId={collection.id}
					collectionSlug={collection.slug}
					products={collection.products}
				/>
			</CardContent>
		</Card>
	);
}
