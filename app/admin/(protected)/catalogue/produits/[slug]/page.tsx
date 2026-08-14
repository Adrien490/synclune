import type { Metadata } from "next";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";

import { ProductDetailPage } from "@/modules/products/components/admin/product-detail/product-detail-page";
import { getProductBySlug } from "@/modules/products/data/get-product";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

const ProductsAdminDialogs = dynamic(() =>
	import("../_components/products-admin-dialogs").then((mod) => mod.ProductsAdminDialogs),
);

type ProductDetailPageParams = Promise<{ slug: string }>;

export async function generateMetadata({
	params,
}: {
	params: ProductDetailPageParams;
}): Promise<Metadata> {
	const { slug } = await params;
	const product = await getProductBySlug({ slug, includeDraft: true });

	if (!product) {
		return {
			title: "Produit introuvable",
		};
	}

	return {
		title: `${product.title} - Administration`,
		description: `Détails du bijou ${product.title}`,
	};
}

export default async function AdminProductDetailPage({
	params,
}: {
	params: ProductDetailPageParams;
}) {
	await assertAdminPage();

	const { slug } = await params;
	const product = await getProductBySlug({ slug, includeDraft: true });

	if (!product) {
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
						<BreadcrumbPage>{product.title}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<ProductDetailPage product={product} />

			<ProductsAdminDialogs />
		</div>
	);
}
