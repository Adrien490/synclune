import { Package } from "lucide-react";

import { CollectionProductsList } from "@/modules/collections/components/admin/collection-products-list";
import type { GetCollectionReturn } from "@/modules/collections/types/collection.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface CollectionDetailProductsCardProps {
	collection: GetCollectionReturn;
}

export function CollectionDetailProductsCard({ collection }: CollectionDetailProductsCardProps) {
	const productsCount = collection.products.length;

	return (
		<Card style={{ viewTransitionName: "collection-edit-products" }}>
			<CardHeader>
				<CardTitle className="flex items-center justify-between gap-2">
					<span className="flex items-center gap-2">
						<Package className="size-5" aria-hidden="true" />
						Produits
					</span>
					<span className="text-muted-foreground text-sm font-normal">
						{productsCount} produit{productsCount > 1 ? "s" : ""}
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<p className="text-muted-foreground text-sm">
					Cliquez sur l&apos;étoile pour définir le produit vedette. Ce produit sera utilisé comme
					image représentative de la collection.
				</p>
				<CollectionProductsList
					collectionId={collection.id}
					collectionSlug={collection.slug}
					products={collection.products}
				/>
			</CardContent>
		</Card>
	);
}
