import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdjustStockForm } from "@/modules/variants/components/admin/adjust-stock-form";
import { getVariantDetailById } from "@/modules/variants/data/get-variant";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";
import { getVariantDisplayTitle } from "@/modules/variants/utils/variant-display-title";

type AdjustStockPageParams = Promise<{ slug: string; variantId: string }>;

export const metadata: Metadata = {
	title: "Ajuster le stock - Administration",
	description: "Ajuster la quantité en stock de la variante",
};

export default async function AdjustStockPage({ params }: { params: AdjustStockPageParams }) {
	await assertAdminPage();

	const { slug, variantId } = await params;
	const variant = await getVariantDetailById(variantId);

	if (!variant || variant.product.slug !== slug) {
		notFound();
	}

	const backPath = `/admin/catalogue/produits/${slug}/variantes/${variantId}`;

	return (
		<div className="space-y-4">
			<h1 className="hidden text-2xl font-semibold md:block">Ajuster le stock</h1>
			<AdjustStockForm
				variantId={variant.id}
				variantName={getVariantDisplayTitle(variant)}
				currentStock={variant.stock}
				redirectOnSuccess
				successPath={backPath}
				className="max-w-2xl"
			/>
		</div>
	);
}
