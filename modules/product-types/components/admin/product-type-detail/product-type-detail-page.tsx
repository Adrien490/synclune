import { TaxonomyDetailLayout } from "@/modules/taxonomies/components/taxonomy-detail-layout";
import type { ProductTypeDetailReturn } from "@/modules/product-types/data/get-product-type";

import { ProductTypeDetailHeader } from "./product-type-detail-header";
import { ProductTypeDetailInfoCard } from "./product-type-detail-info-card";
import { ProductTypeDetailProductsCard } from "./product-type-detail-products-card";
import { ProductTypeDetailStatsCard } from "./product-type-detail-stats-card";

interface ProductTypeDetailPageProps {
	productType: ProductTypeDetailReturn;
	counts: { active: number; draft: number };
}

export function ProductTypeDetailPage({ productType, counts }: ProductTypeDetailPageProps) {
	return (
		<TaxonomyDetailLayout
			header={<ProductTypeDetailHeader productType={productType} />}
			main={
				<>
					<ProductTypeDetailInfoCard productType={productType} />
					<ProductTypeDetailProductsCard productType={productType} />
				</>
			}
			side={<ProductTypeDetailStatsCard total={productType._count.products} counts={counts} />}
		/>
	);
}
