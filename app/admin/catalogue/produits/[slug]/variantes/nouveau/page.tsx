import { getProductBySlug } from "@/modules/products/data/get-product";
import { getColorOptions } from "@/modules/colors/data/get-color-options";
import { getMaterialOptions } from "@/modules/materials/data/get-material-options";
import { notFound } from "next/navigation";
import { CreateProductVariantForm } from "@/modules/skus/components/admin/create-sku-form";
import { DeletePrimaryImageAlertDialog } from "@/modules/media/components/admin/delete-primary-image-alert-dialog";
import { DeleteGalleryMediaAlertDialog } from "@/modules/media/components/admin/delete-gallery-media-alert-dialog";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";

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

	// Récupérer les options avec cache des modules (sans pagination)
	const [colors, materials] = await Promise.all([
		getColorOptions(),
		getMaterialOptions(),
	]);

	return (
		<div className="space-y-6">
			{/* Breadcrumb personnalise */}
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
						<BreadcrumbLink href={`/admin/catalogue/produits/${slug}/modifier`}>
							{product.title}
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href={`/admin/catalogue/produits/${slug}/variantes`}>
							Variantes
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Nouvelle</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div>
				<h2 className="text-xl font-semibold">Nouvelle variante</h2>
				<p className="text-sm text-muted-foreground mt-1">
					Créez une nouvelle variante pour "{product.title}"
				</p>
			</div>

			<CreateProductVariantForm
				colors={colors}
				materials={materials}
				product={{
					id: product.id,
					title: product.title,
				}}
				productSlug={slug}
			/>

			<DeletePrimaryImageAlertDialog />
			<DeleteGalleryMediaAlertDialog />
		</div>
	);
}
