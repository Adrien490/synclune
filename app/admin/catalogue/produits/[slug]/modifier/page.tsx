import { getCollectionOptions } from "@/modules/collections/data/get-collection-options";
import { getColorOptions } from "@/modules/colors/data/get-color-options";
import { getMaterialOptions } from "@/modules/materials/data/get-material-options";
import { getProductTypeOptions } from "@/modules/product-types/data/get-product-type-options";
import { getProductBySlug } from "@/modules/products/data/get-product";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { EditProductForm } from "@/modules/products/components/admin/edit-product-form";
import { PageHeader } from "@/shared/components/page-header";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";

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

type EditProductPageParams = Promise<{ slug: string }>;

export default async function EditProductPage({ params }: { params: EditProductPageParams }) {
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
		<>
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

			<PageHeader title={product.title} variant="compact" className="hidden md:block" />

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
		</>
	);
}
