import type { ColorDetailReturn } from "@/modules/colors/data/get-color";

import { ColorDetailHeader } from "./color-detail-header";
import { ColorDetailInfoCard } from "./color-detail-info-card";
import { ColorDetailPreviewCard } from "./color-detail-preview-card";
import { ColorDetailSkusUsageCard } from "./color-detail-skus-usage-card";
import { ColorDetailStatsCard } from "./color-detail-stats-card";

interface ColorDetailPageProps {
	color: ColorDetailReturn;
	distinctProductsCount: number;
}

export function ColorDetailPage({ color, distinctProductsCount }: ColorDetailPageProps) {
	return (
		<div className="space-y-6">
			<ColorDetailHeader color={color} />

			<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
				<div className="space-y-6 lg:col-span-2">
					<ColorDetailPreviewCard color={color} />
					<ColorDetailInfoCard color={color} />
					<ColorDetailSkusUsageCard color={color} />
				</div>

				<div className="space-y-6">
					<ColorDetailStatsCard
						skusCount={color._count.skus}
						productsCount={distinctProductsCount}
						position={color.position}
					/>
				</div>
			</div>
		</div>
	);
}
