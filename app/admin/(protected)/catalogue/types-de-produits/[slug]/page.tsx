import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { ProductTypeDetailPage } from "@/modules/product-types/components/admin/product-type-detail";
import {
	getProductTypeDetailBySlug,
	getProductTypeProductCounts,
} from "@/modules/product-types/data/get-product-type";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

const ProductTypeFormDialog = dynamic(() =>
	import("@/modules/product-types/components/product-type-form-dialog").then(
		(mod) => mod.ProductTypeFormDialog,
	),
);

const ProductTypesAdminDialogs = dynamic(() =>
	import("../_components/product-types-admin-dialogs").then((mod) => mod.ProductTypesAdminDialogs),
);

type ProductTypeDetailPageParams = Promise<{ slug: string }>;

export async function generateMetadata({
	params,
}: {
	params: ProductTypeDetailPageParams;
}): Promise<Metadata> {
	const { slug } = await params;
	const productType = await getProductTypeDetailBySlug({ slug });

	if (!productType) {
		return { title: "Type introuvable - Administration" };
	}

	return {
		title: `${productType.label} - Type - Administration`,
		description: `Détails du type de produit ${productType.label}`,
	};
}

export default async function AdminProductTypeDetailPage({
	params,
}: {
	params: ProductTypeDetailPageParams;
}) {
	await assertAdminPage();

	const { slug } = await params;
	const productType = await getProductTypeDetailBySlug({ slug });

	if (!productType) {
		notFound();
	}

	const counts = await getProductTypeProductCounts(productType.id);

	return (
		<div className="space-y-6">
			<Breadcrumb className="hidden md:flex">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/catalogue/types-de-produits">
							Types de produits
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{productType.label}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<ProductTypeDetailPage productType={productType} counts={counts} />

			<ProductTypeFormDialog />
			<ProductTypesAdminDialogs />
		</div>
	);
}
