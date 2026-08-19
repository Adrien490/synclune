import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { getProductBySlug } from "@/modules/products/data/get-product";
import { VariantDetailPage } from "@/modules/variants/components/admin/variant-detail/variant-detail-page";
import { getVariantDetailById } from "@/modules/variants/data/get-variant";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";
import { getVariantDisplayTitle } from "@/modules/variants/utils/variant-labels";

const VariantsAdminDialogs = dynamic(() =>
	import("../_components/variants-admin-dialogs").then((mod) => mod.VariantsAdminDialogs),
);

type VariantDetailPageParams = Promise<{ slug: string; variantId: string }>;

export async function generateMetadata({
	params,
}: {
	params: VariantDetailPageParams;
}): Promise<Metadata> {
	const { variantId } = await params;
	const variant = await getVariantDetailById(variantId);

	if (!variant) {
		return { title: "Variante introuvable" };
	}

	return {
		title: `${getVariantDisplayTitle(variant)} - ${variant.product.name} - Administration`,
		description: `Détails de la variante ${getVariantDisplayTitle(variant)} du produit ${variant.product.name}`,
	};
}

export default async function AdminVariantDetailPage({
	params,
}: {
	params: VariantDetailPageParams;
}) {
	await assertAdminPage();

	const { slug, variantId } = await params;

	const [product, variant] = await Promise.all([
		getProductBySlug({ slug, includeDraft: true }),
		getVariantDetailById(variantId),
	]);

	if (!product || !variant) {
		notFound();
	}

	if (variant.productId !== product.id) {
		notFound();
	}

	return (
		<div className="space-y-6">
			<Breadcrumb className="hidden md:flex">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/catalogue/produits">Produits</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href={`/admin/catalogue/produits/${slug}`}>
							{product.name}
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href={`/admin/catalogue/produits/${slug}/variantes`}>
							Variantes
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{getVariantDisplayTitle(variant)}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<VariantDetailPage variant={variant} />

			<VariantsAdminDialogs />
		</div>
	);
}
