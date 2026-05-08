import type { GetProductReturn } from "@/modules/products/types/product.types";

import { ProductDetailCollectionsCard } from "./product-detail-collections-card";
import { ProductDetailHeader } from "./product-detail-header";
import { ProductDetailInfoCard } from "./product-detail-info-card";
import { ProductDetailMediaCard } from "./product-detail-media-card";
import { ProductDetailSkusSummaryCard } from "./product-detail-skus-summary-card";
import { ProductDetailStorefrontLinkCard } from "./product-detail-storefront-link-card";

interface ProductDetailPageProps {
	product: GetProductReturn;
}

export function ProductDetailPage({ product }: ProductDetailPageProps) {
	return (
		<div className="space-y-6">
			<ProductDetailHeader product={product} />

			<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
				<div className="space-y-6 lg:col-span-2">
					<ProductDetailMediaCard product={product} />
					<ProductDetailInfoCard product={product} />
				</div>

				<div className="space-y-6">
					<ProductDetailStorefrontLinkCard slug={product.slug} status={product.status} />
					<ProductDetailSkusSummaryCard product={product} />
					<ProductDetailCollectionsCard collections={product.collections} />
				</div>
			</div>
		</div>
	);
}
