import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { PageHeader } from "@/shared/components/page-header";
import { Badge } from "@/shared/components/ui/badge";
import { getCollectionBySlug } from "@/modules/collections/data/get-collection";
import { COLLECTION_STATUS_LABELS } from "@/modules/collections/constants/collection-status.constants";
import { CollectionProductsList } from "@/modules/collections/components/admin/collection-products-list";
import { SetFeaturedProductAlertDialog } from "@/modules/collections/components/admin/set-featured-product-alert-dialog";

type CollectionDetailPageProps = {
	params: Promise<{ slug: string }>;
};

export async function generateMetadata({
	params,
}: CollectionDetailPageProps): Promise<Metadata> {
	const { slug } = await params;
	const collection = await getCollectionBySlug({ slug });

	if (!collection) {
		return {
			title: "Collection introuvable - Administration",
		};
	}

	return {
		title: `${collection.name} - Administration`,
		description: `Gerer la collection ${collection.name}`,
	};
}

export default async function CollectionDetailPage({
	params,
}: CollectionDetailPageProps) {
	const { slug } = await params;

	const collection = await getCollectionBySlug({ slug });

	if (!collection) {
		notFound();
	}

	// Compter les produits publics
	const publicProductsCount = collection.products.filter(
		(pc) => pc.product.status === "PUBLIC"
	).length;

	// Trouver le produit featured actuel
	const featuredProduct = collection.products.find((pc) => pc.isFeatured);

	return (
		<div className="space-y-6">
			<SetFeaturedProductAlertDialog />

			{/* Breadcrumb */}
			<Breadcrumb className="hidden md:block">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/catalogue/collections">
							Collections
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{collection.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<PageHeader
				variant="compact"
				title={collection.name}
				description={collection.description || undefined}
				actions={
					<div className="flex items-center gap-2">
						<Button variant="outline" asChild>
							<Link href="/admin/catalogue/collections">
								<ArrowLeft className="h-4 w-4 mr-2" />
								Retour
							</Link>
						</Button>
						<Button asChild>
							<Link href={`/admin/catalogue/collections/${slug}/modifier`}>
								<Pencil className="h-4 w-4 mr-2" />
								Modifier
							</Link>
						</Button>
					</div>
				}
			/>

			{/* Infos de la collection */}
			<div className="flex flex-wrap gap-3">
				<Badge variant="outline">
					{COLLECTION_STATUS_LABELS[collection.status]}
				</Badge>
				<Badge variant="secondary">
					{collection.products.length} produit{collection.products.length > 1 ? "s" : ""}
				</Badge>
				<Badge variant="secondary">
					{publicProductsCount} public{publicProductsCount > 1 ? "s" : ""}
				</Badge>
				{featuredProduct && (
					<Badge variant="default">
						Vedette : {featuredProduct.product.title}
					</Badge>
				)}
			</div>

			{/* Liste des produits */}
			<div className="space-y-4">
				<h2 className="text-lg font-semibold">
					Produits de la collection
				</h2>
				<p className="text-sm text-muted-foreground">
					Cliquez sur l'etoile pour definir le produit vedette. Ce produit sera utilise comme image representative de la collection.
				</p>
				<CollectionProductsList
					collectionId={collection.id}
					collectionSlug={collection.slug}
					products={collection.products}
				/>
			</div>
		</div>
	);
}
