import { getCollections } from "@/modules/collections/data/get-collections";
import { getColors } from "@/modules/colors/data/get-colors";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getProductBySlug } from "@/modules/products/data/get-product";
import { notFound } from "next/navigation";
import { EditProductForm } from "@/modules/products/components/admin/edit-product-form";

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

	// Récupérer les types de produits, collections et couleurs pour les selects
	const [productTypesData, collectionsData, colorsData] = await Promise.all([
		getProductTypes({
			perPage: 100,
			sortBy: "label-ascending",
		}),
		getCollections({
			perPage: 100,
			sortBy: "name-ascending",
		}),
		getColors({
			perPage: 100,
			sortBy: "name-ascending",
			direction: "forward",
			filters: {},
		}),
	]);

	return (
		<EditProductForm
			product={product}
			productTypes={productTypesData.productTypes}
			collections={collectionsData.collections}
			colors={colorsData.colors}
		/>
	);
}
