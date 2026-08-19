import type { Metadata } from "next";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";

import { PageHeader } from "@/shared/components/page-header";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { getColorOptions } from "@/modules/colors/data/get-color-options";
import { getMaterialOptions } from "@/modules/materials/data/get-material-options";
import { getProductBySlug } from "@/modules/products/data/get-product";
import { getVariantById } from "@/modules/variants/data/get-variant";
import { EditProductVariantForm } from "@/modules/variants/components/admin/edit-variant-form";
import { DeleteGalleryMediaAlertDialog } from "@/modules/media/components/admin/delete-gallery-media-alert-dialog";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";
import { getVariantDisplayTitle } from "@/modules/variants/utils/variant-labels";

const ColorFormDialog = dynamic(() =>
	import("@/modules/colors/components/color-form-dialog").then((mod) => mod.ColorFormDialog),
);
const MaterialFormDialog = dynamic(() =>
	import("@/modules/materials/components/material-form-dialog").then(
		(mod) => mod.MaterialFormDialog,
	),
);

type EditVariantPageParams = Promise<{ slug: string; variantId: string }>;

export async function generateMetadata({
	params,
}: {
	params: EditVariantPageParams;
}): Promise<Metadata> {
	const { slug, variantId } = await params;

	const [product, variant] = await Promise.all([
		getProductBySlug({ slug, includeDraft: true }),
		getVariantById(variantId),
	]);

	if (!product || !variant) {
		return {
			title: "Modifier variante - Administration",
		};
	}

	return {
		title: `Modifier ${getVariantDisplayTitle(variant)} - ${product.name} - Administration`,
		description: `Modification de la variante ${getVariantDisplayTitle(variant)} du produit ${product.name}`,
	};
}

export default async function EditVariantPage({ params }: { params: EditVariantPageParams }) {
	await assertAdminPage();

	const { slug, variantId } = await params;

	// Récupérer le produit, le VARIANT, les couleurs et matériaux en parallèle
	const [product, variant, colors, materials] = await Promise.all([
		getProductBySlug({ slug, includeDraft: true }),
		getVariantById(variantId),
		getColorOptions(),
		getMaterialOptions(),
	]);

	if (!product || !variant) {
		notFound();
	}

	// Vérifier que le VARIANT appartient bien au produit
	if (variant.productId !== product.id) {
		notFound();
	}

	return (
		<div className="space-y-6">
			{/* Breadcrumb personnalise */}
			<Breadcrumb className="hidden md:block">
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

			<PageHeader
				variant="compact"
				title={`Modifier ${getVariantDisplayTitle(variant)}`}
				description={`Modification de la variante du produit "${product.name}"`}
				className="hidden md:block"
			/>

			<EditProductVariantForm
				colors={colors}
				materials={materials}
				productSlug={slug}
				variant={variant}
			/>

			<DeleteGalleryMediaAlertDialog />
			<ColorFormDialog />
			<MaterialFormDialog />
		</div>
	);
}
