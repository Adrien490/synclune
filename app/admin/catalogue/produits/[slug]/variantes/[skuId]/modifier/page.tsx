import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/shared/components/page-header";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { getProductBySlug } from "@/modules/products/data/get-product";
import { getSkuById } from "@/modules/skus/data/get-sku";
import { EditProductVariantForm } from "@/modules/skus/components/admin/edit-sku-form";
import { prisma } from "@/shared/lib/prisma";

type EditSkuPageParams = Promise<{ slug: string; skuId: string }>;

export async function generateMetadata({
	params,
}: {
	params: EditSkuPageParams;
}): Promise<Metadata> {
	const { slug, skuId } = await params;

	const [product, sku] = await Promise.all([
		getProductBySlug({ slug, includeDraft: true }),
		getSkuById(skuId),
	]);

	if (!product || !sku) {
		return {
			title: "Modifier variante - Administration",
		};
	}

	return {
		title: `Modifier ${sku.sku} - ${product.title} - Administration`,
		description: `Modification de la variante ${sku.sku} du produit ${product.title}`,
	};
}

export default async function EditSkuPage({
	params,
}: {
	params: EditSkuPageParams;
}) {
	const { slug, skuId } = await params;

	// Récupérer le produit, le SKU, les couleurs et matériaux en parallèle
	const [product, sku, colors, materials] = await Promise.all([
		getProductBySlug({ slug, includeDraft: true }),
		getSkuById(skuId),
		prisma.color.findMany({
			select: {
				id: true,
				name: true,
				hex: true,
			},
			orderBy: { name: "asc" },
		}),
		prisma.material.findMany({
			select: {
				id: true,
				name: true,
			},
			orderBy: { name: "asc" },
		}),
	]);

	if (!product || !sku) {
		notFound();
	}

	// Vérifier que le SKU appartient bien au produit
	if (sku.productId !== product.id) {
		notFound();
	}

	return (
		<div className="space-y-6">
			{/* Breadcrumb personnalise */}
			<Breadcrumb>
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
						<BreadcrumbLink href={`/admin/catalogue/produits/${slug}/modifier`}>
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

			<PageHeader
				variant="compact"
				title={`Modifier ${sku.sku}`}
				description={`Modification de la variante du produit "${product.title}"`}
			/>

			<EditProductVariantForm
				colors={colors}
				materials={materials}
				product={{
					id: product.id,
					title: product.title,
				}}
				productSlug={slug}
				sku={sku}
			/>
		</div>
	);
}
