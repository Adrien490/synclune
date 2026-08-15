import { Suspense } from "react";

import { TaxonomyDetailLayout } from "@/modules/taxonomies/components/taxonomy-detail-layout";
import type { ColorDetailReturn } from "@/modules/colors/data/get-color";

import { ColorDetailHeader } from "./color-detail-header";
import { ColorDetailInfoCard } from "./color-detail-info-card";
import { ColorDetailPreviewCard } from "./color-detail-preview-card";
import { ColorDetailVariantsUsageCard } from "./color-detail-variants-usage-card";
import { ColorDetailStatsCardAsync } from "./color-detail-stats-card-async";
import { ColorDetailStatsCardSkeleton } from "./color-detail-stats-card-skeleton";

interface ColorDetailPageProps {
	color: ColorDetailReturn;
	/**
	 * Promesse NON attendue : la coque et les cartes principales streament
	 * pendant que le comptage de produits distincts se résout via Suspense.
	 */
	distinctProductsCountPromise: Promise<number>;
}

export function ColorDetailPage({ color, distinctProductsCountPromise }: ColorDetailPageProps) {
	return (
		<TaxonomyDetailLayout
			header={<ColorDetailHeader color={color} />}
			main={
				<>
					<ColorDetailPreviewCard color={color} />
					<ColorDetailInfoCard color={color} />
					<ColorDetailVariantsUsageCard color={color} />
				</>
			}
			side={
				<Suspense fallback={<ColorDetailStatsCardSkeleton />}>
					<ColorDetailStatsCardAsync
						variantsCount={color._count.variants}
						productsCountPromise={distinctProductsCountPromise}
					/>
				</Suspense>
			}
		/>
	);
}
