import { Suspense } from "react";

import type { ColorDetailReturn } from "@/modules/colors/data/get-color";

import { ColorDetailHeader } from "./color-detail-header";
import { ColorDetailInfoCard } from "./color-detail-info-card";
import { ColorDetailPreviewCard } from "./color-detail-preview-card";
import { ColorDetailSkusUsageCard } from "./color-detail-skus-usage-card";
import { ColorDetailStatsCardAsync } from "./color-detail-stats-card-async";
import { ColorDetailStatsCardSkeleton } from "./color-detail-stats-card-skeleton";

interface ColorDetailPageProps {
	color: ColorDetailReturn;
	/**
	 * Pass a non-awaited promise so the page shell + main cards can stream
	 * while the distinct-product count resolves in parallel via Suspense.
	 */
	distinctProductsCountPromise: Promise<number>;
}

export function ColorDetailPage({ color, distinctProductsCountPromise }: ColorDetailPageProps) {
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
					<Suspense fallback={<ColorDetailStatsCardSkeleton />}>
						<ColorDetailStatsCardAsync
							skusCount={color._count.skus}
							productsCountPromise={distinctProductsCountPromise}
						/>
					</Suspense>
				</div>
			</div>
		</div>
	);
}
