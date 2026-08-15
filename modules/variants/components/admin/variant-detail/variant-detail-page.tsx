import type { VariantDetailReturn } from "@/modules/variants/data/get-variant";

import { VariantDetailHeader } from "./variant-detail-header";
import { VariantDetailInfoCard } from "./variant-detail-info-card";
import { VariantDetailMediaCard } from "./variant-detail-media-card";
import { VariantDetailParentProductCard } from "./variant-detail-parent-product-card";
import { VariantDetailPricingCard } from "./variant-detail-pricing-card";
import { VariantDetailStockCard } from "./variant-detail-stock-card";
import { VariantDetailStorefrontLinkCard } from "./variant-detail-storefront-link-card";

interface VariantDetailPageProps {
	variant: VariantDetailReturn;
}

/**
 * ⚠️ Rend un FRAGMENT — même raison que `ProductDetailPage` : la page
 * `variantes/[variantId]/page.tsx` porte déjà le `space-y-6` autour du fil d'Ariane,
 * de ce bloc et des dialogs. Rendu identique, un palier de moins.
 */
export function VariantDetailPage({ variant }: VariantDetailPageProps) {
	return (
		<>
			<VariantDetailHeader variant={variant} />

			<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
				<div className="space-y-6 lg:col-span-2">
					<VariantDetailMediaCard variant={variant} />
					<VariantDetailInfoCard variant={variant} />
				</div>

				<div className="space-y-6">
					<VariantDetailPricingCard variant={variant} />
					<VariantDetailStockCard variant={variant} />
					<VariantDetailStorefrontLinkCard variant={variant} />
					<VariantDetailParentProductCard variant={variant} />
				</div>
			</div>
		</>
	);
}
