import { getCollectionOptions } from "@/modules/collections/data/get-collection-options";
import { getColorOptions } from "@/modules/colors/data/get-color-options";
import { getMaterialOptions } from "@/modules/materials/data/get-material-options";
import { getProductTypeOptions } from "@/modules/product-types/data/get-product-type-options";
import { getProductBySlug } from "@/modules/products/data/get-product";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { EditProductForm } from "@/modules/products/components/admin/edit-product-form";
import { AlertDialogSkeleton } from "@/shared/components/skeletons/lazy-loading";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";

// Lazy loading - dialogs charges uniquement a l'ouverture
const DeleteGalleryMediaAlertDialog = dynamic(
	() => import("@/modules/media/components/admin/delete-gallery-media-alert-dialog").then((mod) => mod.DeleteGalleryMediaAlertDialog),
	{ loading: () => <AlertDialogSkeleton /> }
);

type EditProductPageParams = Promise<{ slug: string }>;

export default async function EditProductPage({
	params,
}: {
	params: EditProductPageParams;
}) {
	const { slug } = await params;

	// Récupérer le produit complet avec getProductBySlug (inclut les SKUs et images)
	const product = await getProductBySlug({
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
		<div className="space-y-6">
			{/* Breadcrumb personnalise avec titre du produit */}
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
						<BreadcrumbPage>{product.title}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<EditProductForm
				product={product}
				productTypes={productTypes}
				collections={collections}
				colors={colors}
				materials={materials}
			/>

			<DeleteGalleryMediaAlertDialog />
		</div>
	);
}
