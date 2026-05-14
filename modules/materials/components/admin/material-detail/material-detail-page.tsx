import { Suspense } from "react";

import type { MaterialDetailReturn } from "@/modules/materials/data/get-material";

import { MaterialDetailHeader } from "./material-detail-header";
import { MaterialDetailInfoCard } from "./material-detail-info-card";
import { MaterialDetailSkusUsageCard } from "./material-detail-skus-usage-card";
import { MaterialDetailStatsCardAsync } from "./material-detail-stats-card-async";
import { MaterialDetailStatsCardSkeleton } from "./material-detail-stats-card-skeleton";

interface MaterialDetailPageProps {
	material: MaterialDetailReturn;
	/**
	 * Pass a non-awaited promise so the page shell + main cards can stream
	 * while the distinct-product count resolves in parallel via Suspense.
	 */
	distinctProductsCountPromise: Promise<number>;
}

export function MaterialDetailPage({
	material,
	distinctProductsCountPromise,
}: MaterialDetailPageProps) {
	return (
		<div className="space-y-6">
			<MaterialDetailHeader material={material} />

			<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
				<div className="space-y-6 lg:col-span-2">
					<MaterialDetailInfoCard material={material} />
					<MaterialDetailSkusUsageCard material={material} />
				</div>

				<div className="space-y-6">
					<Suspense fallback={<MaterialDetailStatsCardSkeleton />}>
						<MaterialDetailStatsCardAsync
							skusCount={material._count.skus}
							productsCountPromise={distinctProductsCountPromise}
						/>
					</Suspense>
				</div>
			</div>
		</div>
	);
}
