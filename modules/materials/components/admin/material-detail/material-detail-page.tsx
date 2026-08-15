import { Suspense } from "react";

import { TaxonomyDetailLayout } from "@/modules/taxonomies/components/taxonomy-detail-layout";
import type { MaterialDetailReturn } from "@/modules/materials/data/get-material";

import { MaterialDetailHeader } from "./material-detail-header";
import { MaterialDetailInfoCard } from "./material-detail-info-card";
import { MaterialDetailVariantsUsageCard } from "./material-detail-variants-usage-card";
import { MaterialDetailStatsCardAsync } from "./material-detail-stats-card-async";
import { MaterialDetailStatsCardSkeleton } from "./material-detail-stats-card-skeleton";

interface MaterialDetailPageProps {
	material: MaterialDetailReturn;
	/**
	 * Promesse NON attendue : la coque et les cartes principales streament
	 * pendant que le comptage de produits distincts se résout via Suspense.
	 */
	distinctProductsCountPromise: Promise<number>;
}

export function MaterialDetailPage({
	material,
	distinctProductsCountPromise,
}: MaterialDetailPageProps) {
	return (
		<TaxonomyDetailLayout
			header={<MaterialDetailHeader material={material} />}
			main={
				<>
					<MaterialDetailInfoCard material={material} />
					<MaterialDetailVariantsUsageCard material={material} />
				</>
			}
			side={
				<Suspense fallback={<MaterialDetailStatsCardSkeleton />}>
					<MaterialDetailStatsCardAsync
						variantsCount={material._count.variants}
						productsCountPromise={distinctProductsCountPromise}
					/>
				</Suspense>
			}
		/>
	);
}
