"use client";

import { ProductStatus } from "@/app/generated/prisma/enums";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { AlertTriangle, Package, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { GetCollectionReturn } from "../../types/collection.types";
import { SET_FEATURED_PRODUCT_DIALOG_ID } from "./set-featured-product-alert-dialog";

// Status labels et variants
const STATUS_CONFIG: Record<
	ProductStatus,
	{ label: string; variant: "default" | "secondary" | "outline" }
> = {
	[ProductStatus.PUBLIC]: { label: "Public", variant: "default" },
	[ProductStatus.DRAFT]: { label: "Brouillon", variant: "secondary" },
	[ProductStatus.ARCHIVED]: { label: "Archive", variant: "outline" },
};

interface CollectionProductsListProps {
	collectionId: string;
	collectionSlug: string;
	products: GetCollectionReturn["products"];
}

export function CollectionProductsList({
	collectionId,
	collectionSlug,
	products,
}: CollectionProductsListProps) {
	const { open: openSetFeaturedDialog } = useAlertDialog(
		SET_FEATURED_PRODUCT_DIALOG_ID
	);

	const handleSetFeatured = (
		productId: string,
		productTitle: string,
		isFeatured: boolean
	) => {
		openSetFeaturedDialog({
			collectionId,
			collectionSlug,
			productId,
			productTitle,
			isFeatured,
		});
	};

	if (products.length === 0) {
		return (
			<TableEmptyState
				icon={Package}
				title="Aucun produit dans cette collection"
				description="Ajoutez des produits a cette collection depuis la page d'edition des produits."
				action={{
					label: "Voir les produits",
					href: "/admin/catalogue/produits",
				}}
			/>
		);
	}

	return (
		<Card>
			<CardContent className="p-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[50px]">Vedette</TableHead>
							<TableHead className="w-[80px]">Image</TableHead>
							<TableHead>Produit</TableHead>
							<TableHead className="hidden sm:table-cell">Statut</TableHead>
							<TableHead className="hidden md:table-cell text-right">
								Prix
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{products.map((pc) => {
							const product = pc.product;
							const defaultSku = product.skus.find((s) => s.isDefault) || product.skus[0];
							const primaryImage = defaultSku?.images.find((i) => i.isPrimary) ||
								defaultSku?.images[0];
							const price = defaultSku?.priceInclTax;

							return (
								<TableRow key={pc.id}>
									{/* Bouton etoile pour featured */}
									<TableCell>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8"
													onClick={() =>
														handleSetFeatured(
															product.id,
															product.title,
															pc.isFeatured
														)
													}
													aria-label={
														pc.isFeatured
															? "Retirer le statut vedette"
															: "Definir comme vedette"
													}
												>
													<Star
														className={`h-5 w-5 transition-colors ${
															pc.isFeatured
																? "fill-yellow-400 text-yellow-400"
																: "text-muted-foreground hover:text-yellow-400"
														}`}
													/>
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												{pc.isFeatured
													? "Retirer le statut vedette"
													: "Definir comme produit vedette"}
											</TooltipContent>
										</Tooltip>
									</TableCell>

									{/* Image */}
									<TableCell>
										{primaryImage ? (
											<div className="relative h-12 w-12 overflow-hidden rounded-md bg-muted">
												<Image
													src={primaryImage.url}
													alt={primaryImage.altText || product.title}
													fill
													className="object-cover"
													sizes="48px"
												/>
											</div>
										) : (
											<div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
												<Package className="h-5 w-5 text-muted-foreground" />
											</div>
										)}
									</TableCell>

									{/* Titre du produit */}
									<TableCell>
										<div className="flex flex-col gap-1">
											<Link
												href={`/admin/catalogue/produits/${product.slug}/modifier`}
												className="font-medium hover:underline"
											>
												{product.title}
											</Link>
											{product.type && (
												<span className="text-xs text-muted-foreground">
													{product.type.label}
												</span>
											)}
										</div>
									</TableCell>

									{/* Statut */}
									<TableCell className="hidden sm:table-cell">
										<div className="flex items-center gap-2">
											<Badge variant={STATUS_CONFIG[product.status].variant}>
												{STATUS_CONFIG[product.status].label}
											</Badge>
											{/* Avertissement si produit featured non-PUBLIC */}
											{pc.isFeatured && product.status !== ProductStatus.PUBLIC && (
												<Tooltip>
													<TooltipTrigger asChild>
														<span className="text-amber-500">
															<AlertTriangle className="h-4 w-4" />
														</span>
													</TooltipTrigger>
													<TooltipContent>
														<p>Ce produit vedette n'est pas visible sur le site</p>
													</TooltipContent>
												</Tooltip>
											)}
										</div>
									</TableCell>

									{/* Prix */}
									<TableCell className="hidden md:table-cell text-right">
										{price ? (
											<span className="font-medium">
												{(price / 100).toFixed(2)} €
											</span>
										) : (
											<span className="text-muted-foreground">-</span>
										)}
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
