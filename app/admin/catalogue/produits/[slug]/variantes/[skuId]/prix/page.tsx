import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UpdatePriceForm } from "@/modules/skus/components/admin/update-price-form";
import { getSkuDetailById } from "@/modules/skus/data/get-sku";

type UpdatePricePageParams = Promise<{ slug: string; skuId: string }>;

export const metadata: Metadata = {
	title: "Modifier le prix - Administration",
	description: "Modifier le prix de la variante",
};

export default async function UpdatePricePage({ params }: { params: UpdatePricePageParams }) {
	const { slug, skuId } = await params;
	const sku = await getSkuDetailById(skuId);

	if (!sku || sku.product.slug !== slug) {
		notFound();
	}

	const backPath = `/admin/catalogue/produits/${slug}/variantes/${skuId}`;

	return (
		<div className="space-y-4">
			<h1 className="hidden text-2xl font-semibold md:block">Modifier le prix</h1>
			<UpdatePriceForm
				skuId={sku.id}
				skuName={sku.sku}
				currentPrice={sku.priceInclTax}
				currentCompareAtPrice={sku.compareAtPrice}
				redirectOnSuccess
				successPath={backPath}
				className="max-w-2xl"
			/>
		</div>
	);
}
