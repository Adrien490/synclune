import type { ProductTypeDetailReturn } from "@/modules/product-types/data/get-product-type";

import { ProductTypeDetailHeader } from "./product-type-detail-header";
import { ProductTypeDetailInfoCard } from "./product-type-detail-info-card";
import { ProductTypeDetailProductsCard } from "./product-type-detail-products-card";
import { ProductTypeDetailStatsCard } from "./product-type-detail-stats-card";

interface ProductTypeDetailPageProps {
	productType: ProductTypeDetailReturn;
	counts: { public: number; draft: number; archived: number };
}

export function ProductTypeDetailPage({ productType, counts }: ProductTypeDetailPageProps) {
	return (
		<div className="space-y-6">
			<ProductTypeDetailHeader productType={productType} />

			<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
				<div className="space-y-6 lg:col-span-2">
					<ProductTypeDetailInfoCard productType={productType} />
					<ProductTypeDetailProductsCard productType={productType} />
				</div>

				<div className="space-y-6">
					<ProductTypeDetailStatsCard total={productType._count.products} counts={counts} />
				</div>
			</div>
		</div>
	);
}
