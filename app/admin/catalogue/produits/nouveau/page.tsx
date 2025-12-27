import { PageHeader } from "@/shared/components/page-header";
import { CreateProductForm } from "@/modules/products/components/admin/create-product-form";
import { getProductTypeOptions } from "@/modules/product-types/data/get-product-type-options";
import { getCollectionOptions } from "@/modules/collections/data/get-collection-options";
import { getColorOptions } from "@/modules/colors/data/get-color-options";
import { getMaterialOptions } from "@/modules/materials/data/get-material-options";
import { Metadata } from "next";
import dynamic from "next/dynamic";
import { AlertDialogSkeleton } from "@/shared/components/skeletons/lazy-loading";

// Lazy loading - dialogs charges uniquement a l'ouverture
const DeleteGalleryMediaAlertDialog = dynamic(
	() => import("@/modules/media/components/admin/delete-gallery-media-alert-dialog").then((mod) => mod.DeleteGalleryMediaAlertDialog),
	{ loading: () => <AlertDialogSkeleton /> }
);

export const metadata: Metadata = {
	title: "Nouveau produit - Administration",
	description: "Créer un nouveau produit",
};

export default async function NewProductPage() {
	// Récupérer les options avec cache des modules (sans pagination)
	const [productTypes, collections, colors, materials] = await Promise.all([
		getProductTypeOptions(),
		getCollectionOptions(),
		getColorOptions(),
		getMaterialOptions(),
	]);

	return (
		<>
			<PageHeader title="Nouveau produit" variant="compact" />

			<CreateProductForm
				productTypes={productTypes}
				collections={collections}
				colors={colors}
				materials={materials}
			/>

			<DeleteGalleryMediaAlertDialog />
		</>
	);
}
