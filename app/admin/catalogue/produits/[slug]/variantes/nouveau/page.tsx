import { getProductBySlug } from "@/modules/products/data/get-product";
import { prisma } from "@/shared/lib/prisma";
import { notFound } from "next/navigation";
import { CreateProductVariantForm } from "@/modules/products/components/admin/variants/create-product-variant-form";

type NewProductVariantPageParams = Promise<{ slug: string }>;

export default async function NewProductVariantPage({
	params,
}: {
	params: NewProductVariantPageParams;
}) {
	const { slug } = await params;

	// Récupérer le produit
	const product = await getProductBySlug({
		slug,
		includeDraft: true,
	});

	if (!product) {
		notFound();
	}

	// Récupérer les couleurs disponibles
	const colors = await prisma.color.findMany({
		select: {
			id: true,
			name: true,
			hex: true,
		},
		orderBy: { name: "asc" },
	});

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold">Nouvelle variante</h2>
				<p className="text-sm text-muted-foreground mt-1">
					Créez une nouvelle variante pour "{product.title}"
				</p>
			</div>

			<CreateProductVariantForm
				colors={colors}
				product={{
					id: product.id,
					title: product.title,
				}}
				productSlug={slug}
			/>
		</div>
	);
}
