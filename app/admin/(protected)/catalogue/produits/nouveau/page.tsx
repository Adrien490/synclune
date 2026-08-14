import { PageHeader } from "@/shared/components/page-header";
import { CreateProductForm } from "@/modules/products/components/admin/create-product-form";
import { getProductTypeOptions } from "@/modules/product-types/data/get-product-type-options";
import { getCollectionOptions } from "@/modules/collections/data/get-collection-options";
import { getColorOptions } from "@/modules/colors/data/get-color-options";
import { getMaterialOptions } from "@/modules/materials/data/get-material-options";
import { type Metadata } from "next";
import dynamic from "next/dynamic";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

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
	title: "Nouveau produit - Administration",
	description: "Créer un nouveau produit",
};

export default async function NewProductPage() {
	await assertAdminPage();

	// Récupérer les options avec cache des modules (sans pagination)
	const [productTypes, collections, colors, materials] = await Promise.all([
		getProductTypeOptions(),
		getCollectionOptions(),
		getColorOptions(),
		getMaterialOptions(),
	]);

	return (
		<div className="space-y-4">
			<PageHeader title="Nouveau produit" variant="compact" className="hidden md:block" />

			<CreateProductForm
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
