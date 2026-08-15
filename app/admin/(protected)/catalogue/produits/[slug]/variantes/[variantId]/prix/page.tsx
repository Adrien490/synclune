import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UpdatePriceForm } from "@/modules/variants/components/admin/update-price-form";
import { getVariantDetailById } from "@/modules/variants/data/get-variant";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";
import { getVariantDisplayTitle } from "@/modules/variants/utils/variant-display-title";

type UpdatePricePageParams = Promise<{ slug: string; variantId: string }>;

export const metadata: Metadata = {
	title: "Modifier le prix - Administration",
	description: "Modifier le prix de la variante",
};

export default async function UpdatePricePage({ params }: { params: UpdatePricePageParams }) {
	await assertAdminPage();

	const { slug, variantId } = await params;
	const variant = await getVariantDetailById(variantId);

	if (!variant || variant.product.slug !== slug) {
		notFound();
	}

	const backPath = `/admin/catalogue/produits/${slug}/variantes/${variantId}`;

	return (
		<div className="space-y-4">
			<h1 className="hidden text-2xl font-semibold md:block">Modifier le prix</h1>
			<UpdatePriceForm
				variantId={variant.id}
				variantName={getVariantDisplayTitle(variant)}
				currentPrice={variant.priceCents ?? variant.product.priceCents}
				currentCompareAtPrice={null}
				redirectOnSuccess
				successPath={backPath}
				className="max-w-2xl"
			/>
		</div>
	);
}
