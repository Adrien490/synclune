import type { ReviewableProduct } from "../types/review.types";
import { ReviewableProductCard } from "./reviewable-product-card";

interface ReviewableProductsSectionProps {
	products: ReviewableProduct[];
}

export function ReviewableProductsSection({ products }: ReviewableProductsSectionProps) {
	return (
		<section aria-labelledby="reviewable-heading">
			<h2
				id="reviewable-heading"
				className="mb-4 text-lg/7 font-semibold tracking-tight antialiased"
			>
				Produits à évaluer ({products.length})
			</h2>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{products.map((product) => (
					<ReviewableProductCard key={product.productId} product={product} />
				))}
			</div>
		</section>
	);
}
