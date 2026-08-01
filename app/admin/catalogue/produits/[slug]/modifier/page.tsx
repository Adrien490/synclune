import { getCollectionOptions } from "@/modules/collections/data/get-collection-options";
import { getColorOptions } from "@/modules/colors/data/get-color-options";
import { getMaterialOptions } from "@/modules/materials/data/get-material-options";
import { getProductTypeOptions } from "@/modules/product-types/data/get-product-type-options";
import type { Metadata } from "next";

import { getProductForEdit } from "@/modules/products/data/get-product-for-edit";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { EditProductForm } from "@/modules/products/components/admin/edit-product-form";
import { PageHeader } from "@/shared/components/page-header";
import { assertAdminPage } from "@/modules/auth/lib/assert-admin-page";

// Lazy loading - dialogs charges uniquement a l'ouverture
const DeleteGalleryMediaAlertDialog = dynamic(() =>
	import("@/modules/media/components/admin/delete-gallery-media-alert-dialog").then(
		(mod) => mod.DeleteGalleryMediaAlertDialog,
	),
);
const ProductTypeFormDialog = dynamic(() =>
	import("@/modules/product-types/components/product-type-form-dialog").then(
		(mod) => mod.ProductTypeFormDialog,
	),
);
const ColorFormDialog = dynamic(() =>
	import("@/modules/colors/components/color-form-dialog").then((mod) => mod.ColorFormDialog),
);
const MaterialFormDialog = dynamic(() =>
	import("@/modules/materials/components/material-form-dialog").then(
		(mod) => mod.MaterialFormDialog,
	),
);
const CollectionFormDialog = dynamic(() =>
	import("@/modules/collections/components/admin/collection-form-dialog").then(
		(mod) => mod.CollectionFormDialog,
	),
);

export const metadata: Metadata = {
	title: "Modifier le produit - Administration",
	description: "Modifier un produit du catalogue",
};

type EditProductPageParams = Promise<{ slug: string }>;

export default async function EditProductPage({ params }: { params: EditProductPageParams }) {
	await assertAdminPage();

	const { slug } = await params;

	// Variante édition : inclut aussi les SKUs INACTIFS — l'archivage les
	// désactive tous, et le select public rendait ce formulaire vide et
	// non-enregistrable pour tout produit archivé.
	const product = await getProductForEdit({
		slug,
		includeDraft: true, // Inclure les DRAFT pour l'édition admin
	});

	if (!product) {
		notFound();
	}

	// Récupérer les options avec cache des modules (sans pagination)
	const [productTypes, collections, colors, materials] = await Promise.all([
		getProductTypeOptions(),
		getCollectionOptions(),
		getColorOptions(),
		getMaterialOptions(),
	]);

	return (
		<div className="space-y-4">
			<PageHeader title={product.title} variant="compact" />

			<EditProductForm
				product={product}
				productTypes={productTypes}
				collections={collections}
				colors={colors}
				materials={materials}
			/>

			<DeleteGalleryMediaAlertDialog />
			<ProductTypeFormDialog />
			<ColorFormDialog />
			<MaterialFormDialog />
			<CollectionFormDialog />
		</div>
	);
}
