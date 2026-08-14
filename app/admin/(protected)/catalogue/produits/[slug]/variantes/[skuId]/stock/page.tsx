import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdjustStockForm } from "@/modules/skus/components/admin/adjust-stock-form";
import { getSkuDetailById } from "@/modules/skus/data/get-sku";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

type AdjustStockPageParams = Promise<{ slug: string; skuId: string }>;

export const metadata: Metadata = {
	title: "Ajuster le stock - Administration",
	description: "Ajuster la quantité en stock de la variante",
};

export default async function AdjustStockPage({ params }: { params: AdjustStockPageParams }) {
	await assertAdminPage();

	const { slug, skuId } = await params;
	const sku = await getSkuDetailById(skuId);

	if (!sku || sku.product.slug !== slug) {
		notFound();
	}

	const backPath = `/admin/catalogue/produits/${slug}/variantes/${skuId}`;

	return (
		<div className="space-y-4">
			<h1 className="hidden text-2xl font-semibold md:block">Ajuster le stock</h1>
			<AdjustStockForm
				skuId={sku.id}
				skuName={sku.sku}
				currentStock={sku.inventory}
				redirectOnSuccess
				successPath={backPath}
				className="max-w-2xl"
			/>
		</div>
	);
}
