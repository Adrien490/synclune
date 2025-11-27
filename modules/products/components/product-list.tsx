import { CursorPagination } from "@/shared/components/cursor-pagination";
import { Button } from "@/shared/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { ProductCard } from "@/modules/products/components/product-card";
import { GetProductsReturn } from "@/modules/products/data/get-products";
import {
	getPrimaryImageForList,
	getPrimaryPriceForList,
	getStockInfoForList,
} from "@/shared/lib/product/product-list-helpers";
import { SearchX } from "lucide-react";

interface ProductListProps {
	productsPromise: Promise<GetProductsReturn>;
	perPage: number;
}

export async function ProductList({
	productsPromise,
	perPage,
}: ProductListProps) {
	const { products, pagination } = await productsPromise;

	// Afficher le composant Empty si aucun produit
	if (!products || products.length === 0) {
		return (
			<Empty className="my-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<SearchX className="size-6" />
					</EmptyMedia>
					<EmptyTitle>Aucun bijou trouvé</EmptyTitle>
				</EmptyHeader>
				<EmptyContent>
					<Button asChild variant="primary">
						<a href="/produits">Voir tous les bijoux</a>
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	const { nextCursor, prevCursor, hasNextPage, hasPreviousPage } = pagination;

	// Layout Grid par défaut
	return (
		<div className="space-y-8 group-has-data-pending/container:animate-pulse">
			{/* Grille des produits */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
				{products.map((product) => {
					const { price } = getPrimaryPriceForList(product);
					const stockInfo = getStockInfoForList(product);
					const primaryImage = getPrimaryImageForList(product);

					return (
						<div key={product.id} className="product-item">
							<ProductCard
								slug={product.slug}
								title={product.title}
								description={product.description}
								price={price}
								stockStatus={stockInfo.status}
								stockMessage={stockInfo.message}
								primaryImage={{
									url: primaryImage.url,
									alt: primaryImage.alt || null,
									mediaType: primaryImage.mediaType,
								}}
							/>
						</div>
					);
				})}
			</div>
			<div className="flex justify-end mt-12">
				<CursorPagination
					perPage={perPage}
					hasNextPage={hasNextPage}
					hasPreviousPage={hasPreviousPage}
					currentPageSize={products.length}
					nextCursor={nextCursor}
					prevCursor={prevCursor}
				/>
			</div>
		</div>
	);
}
