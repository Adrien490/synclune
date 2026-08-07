import type { SkuDetailReturn } from "@/modules/skus/data/get-sku";

import { SkuDetailHeader } from "./sku-detail-header";
import { SkuDetailInfoCard } from "./sku-detail-info-card";
import { SkuDetailMediaCard } from "./sku-detail-media-card";
import { SkuDetailParentProductCard } from "./sku-detail-parent-product-card";
import { SkuDetailPricingCard } from "./sku-detail-pricing-card";
import { SkuDetailStockCard } from "./sku-detail-stock-card";
import { SkuDetailStorefrontLinkCard } from "./sku-detail-storefront-link-card";

interface SkuDetailPageProps {
	sku: SkuDetailReturn;
}

/**
 * ⚠️ Rend un FRAGMENT — même raison que `ProductDetailPage` : la page
 * `variantes/[skuId]/page.tsx` porte déjà le `space-y-6` autour du fil d'Ariane,
 * de ce bloc et des dialogs. Rendu identique, un palier de moins.
 */
export function SkuDetailPage({ sku }: SkuDetailPageProps) {
	return (
		<>
			<SkuDetailHeader sku={sku} />

			<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
				<div className="space-y-6 lg:col-span-2">
					<SkuDetailMediaCard sku={sku} />
					<SkuDetailInfoCard sku={sku} />
				</div>

				<div className="space-y-6">
					<SkuDetailPricingCard sku={sku} />
					<SkuDetailStockCard sku={sku} />
					<SkuDetailStorefrontLinkCard sku={sku} />
					<SkuDetailParentProductCard sku={sku} />
				</div>
			</div>
		</>
	);
}
