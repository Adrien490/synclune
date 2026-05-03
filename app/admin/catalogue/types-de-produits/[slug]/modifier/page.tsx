import { type Metadata } from "next";
import { notFound } from "next/navigation";

import { EditProductTypeForm } from "@/modules/product-types/components/admin/edit-product-type-form";
import { getProductTypeBySlug } from "@/modules/product-types/data/get-product-type";

interface EditProductTypePageProps {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EditProductTypePageProps): Promise<Metadata> {
	const { slug } = await params;
	const productType = await getProductTypeBySlug({ slug, includeInactive: true });
	return {
		title: productType ? `Modifier ${productType.label}` : "Type introuvable",
	};
}

export default async function EditProductTypePage({ params }: EditProductTypePageProps) {
	const { slug } = await params;
	const productType = await getProductTypeBySlug({ slug, includeInactive: true });

	if (!productType || productType.isSystem) notFound();

	return (
		<>
			<h1 className="mb-6 text-2xl font-semibold">{productType.label}</h1>
			<EditProductTypeForm
				productType={{
					id: productType.id,
					label: productType.label,
					slug: productType.slug,
					description: productType.description,
				}}
				className="max-w-md"
			/>
		</>
	);
}
