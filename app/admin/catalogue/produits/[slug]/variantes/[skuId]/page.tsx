import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { getProductBySlug } from "@/modules/products/data/get-product";
import { SkuDetailPage } from "@/modules/skus/components/admin/sku-detail";
import { getSkuDetailById } from "@/modules/skus/data/get-sku";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";

const SkusAdminDialogs = dynamic(() =>
	import("../_components/skus-admin-dialogs").then((mod) => mod.SkusAdminDialogs),
);

type SkuDetailPageParams = Promise<{ slug: string; skuId: string }>;

export async function generateMetadata({
	params,
}: {
	params: SkuDetailPageParams;
}): Promise<Metadata> {
	const { skuId } = await params;
	const sku = await getSkuDetailById(skuId);

	if (!sku) {
		return { title: "Variante introuvable" };
	}

	return {
		title: `${sku.sku} - ${sku.product.title} - Administration`,
		description: `Détails de la variante ${sku.sku} du produit ${sku.product.title}`,
	};
}

export default async function AdminSkuDetailPage({ params }: { params: SkuDetailPageParams }) {
	const { slug, skuId } = await params;

	const [product, sku] = await Promise.all([
		getProductBySlug({ slug, includeDraft: true }),
		getSkuDetailById(skuId),
	]);

	if (!product || !sku) {
		notFound();
	}

	if (sku.productId !== product.id) {
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
							{product.title}
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
						<BreadcrumbPage>{sku.sku}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<SkuDetailPage sku={sku} />

			<SkusAdminDialogs />
		</div>
	);
}
