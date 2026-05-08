import type { MaterialDetailReturn } from "@/modules/materials/data/get-material";

import { MaterialDetailHeader } from "./material-detail-header";
import { MaterialDetailInfoCard } from "./material-detail-info-card";
import { MaterialDetailSkusUsageCard } from "./material-detail-skus-usage-card";
import { MaterialDetailStatsCard } from "./material-detail-stats-card";

interface MaterialDetailPageProps {
	material: MaterialDetailReturn;
	distinctProductsCount: number;
}

export function MaterialDetailPage({ material, distinctProductsCount }: MaterialDetailPageProps) {
	return (
		<div className="space-y-6">
			<MaterialDetailHeader material={material} />

			<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
				<div className="space-y-6 lg:col-span-2">
					<MaterialDetailInfoCard material={material} />
					<MaterialDetailSkusUsageCard material={material} />
				</div>

				<div className="space-y-6">
					<MaterialDetailStatsCard
						skusCount={material._count.skus}
						productsCount={distinctProductsCount}
					/>
				</div>
			</div>
		</div>
	);
}
