import { PageHeader } from "@/shared/components/page-header";
import { prisma } from "@/shared/lib/prisma";
import { CreateProductForm } from "@/modules/products/components/admin/create-product-form";
import { DeletePrimaryImageAlertDialog } from "@/modules/medias/components/admin/delete-primary-image-alert-dialog";
import { DeleteGalleryMediaAlertDialog } from "@/modules/medias/components/admin/delete-gallery-media-alert-dialog";
import { headers } from "next/headers";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Nouveau produit - Administration",
	description: "Créer un nouveau produit",
};

export default async function NewProductPage() {
	// Access headers to mark this as dynamic (required for Cache Components with Prisma)
	await headers();

	// Récupérer les types de produits, collections, couleurs et matériaux
	const [productTypes, collections, colors, materials] = await Promise.all([
		prisma.productType.findMany({
			where: { isActive: true },
			select: {
				id: true,
				label: true,
				slug: true,
				isActive: true,
			},
			orderBy: { label: "asc" },
		}),
		prisma.collection.findMany({
			select: {
				id: true,
				name: true,
				slug: true,
			},
			orderBy: { name: "asc" },
		}),
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

	return (
		<>
			<PageHeader title="Nouveau produit" variant="compact" />

			<CreateProductForm
				productTypes={productTypes}
				collections={collections}
				colors={colors}
				materials={materials}
			/>

			<DeletePrimaryImageAlertDialog />
			<DeleteGalleryMediaAlertDialog />
		</>
	);
}
