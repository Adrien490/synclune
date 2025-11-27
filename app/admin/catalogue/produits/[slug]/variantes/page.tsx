import { Button } from "@/shared/components/ui/button";
import { getProductSkus } from "@/modules/products/data/get-product-skus";
import { parseProductSkuParams } from "@/modules/products/utils/parse-product-sku-params";
import { getProductBySlug } from "@/modules/products/data/get-product";
import { Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductVariantsDataTable } from "@/modules/products/components/admin/variants/product-variants-data-table";
import type { ProductVariantsSearchParams } from "./_types/search-params";

type ProductVariantsPageProps = {
	params: Promise<{ slug: string }>;
	searchParams: Promise<ProductVariantsSearchParams>;
};

export default async function ProductVariantsPage({
	params,
	searchParams,
}: ProductVariantsPageProps) {
	const { slug } = await params;
	const searchParamsData = await searchParams;

	// Parse and validate all search parameters safely
	const { cursor, direction, perPage, sortBy, search } =
		parseProductSkuParams(searchParamsData);

	// Récupérer le produit
	const product = await getProductBySlug({
		slug,
		includeDraft: true,
	});

	if (!product) {
		notFound();
	}

	const skusPromise = getProductSkus({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters: {
			productId: product.id,
		},
	});

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm text-muted-foreground">
						Gérez les différentes variantes de ce produit (couleur, taille,
						matériau, etc.)
					</p>
				</div>
				<Button asChild>
					<Link
						href={`/admin/catalogue/produits/${slug}/variantes/nouveau`}
					>
						<Plus className="mr-2 h-4 w-4" />
						Nouvelle variante
					</Link>
				</Button>
			</div>

			<ProductVariantsDataTable skusPromise={skusPromise} productSlug={slug} />
		</div>
	);
}
