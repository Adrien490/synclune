"use client";

import { PublicationStatus } from "@/app/generated/prisma/enums";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { formatEuro } from "@/shared/utils/format-euro";
import { PackageIcon, StarIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";
import type { GetCollectionReturn } from "../../types/collection.types";
import { SET_FEATURED_PRODUCT_DIALOG_ID } from "./set-featured-product-alert-dialog";

// Status labels et variants
const STATUS_CONFIG: Record<
	PublicationStatus,
	{ label: string; variant: "default" | "secondary" | "outline" }
> = {
	[PublicationStatus.PUBLIC]: { label: "Public", variant: "default" },
	[PublicationStatus.DRAFT]: { label: "Brouillon", variant: "secondary" },
	[PublicationStatus.ARCHIVED]: { label: "Archive", variant: "outline" },
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
	const { open: openSetFeaturedDialog } = useAlertDialog(SET_FEATURED_PRODUCT_DIALOG_ID);

	// La vedette est le rang 0 de (position asc, addedAt desc) : il y en a toujours
	// une, on ne peut que la REMPLACER — le flux « retirer » est parti avec `isFeatured`.
	const handleSetFeatured = (productId: string, productTitle: string) => {
		openSetFeaturedDialog({
			collectionId,
			collectionSlug,
			productId,
			productTitle,
		});
	};

	if (products.length === 0) {
		return (
			<TableEmptyState
				icon={PackageIcon}
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
							<TableHead className="w-20">Image</TableHead>
							<TableHead>Produit</TableHead>
							<TableHead className="hidden sm:table-cell">Statut</TableHead>
							<TableHead className="hidden text-right md:table-cell">Prix</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{products.map((pc, index) => {
							const product = pc.product;
							// Listes PRÉ-TRIÉES par le select : SKU représentant = rang 0 de
							// (position, id), image principale = première IMAGE de cet ordre
							// (le select ne remonte que des mediaType: IMAGE).
							const defaultSku = product.skus[0];
							const primaryImage = defaultSku?.images[0];
							const price = defaultSku?.priceInclTax;
							// La vedette est le premier element de la liste pre-triee (rang 0)
							const isFeatured = index === 0;

							return (
								<TableRow key={product.id}>
									{/* Rang 0 : badge vedette statique. Autres rangs : action « Definir comme vedette » */}
									<TableCell>
										{isFeatured ? (
											<Tooltip>
												<TooltipTrigger
													render={<span className="flex size-8 items-center justify-center" />}
												>
													<StarIcon
														className="size-5 fill-yellow-400 text-yellow-400"
														aria-label="Produit vedette"
													/>
												</TooltipTrigger>
												<TooltipContent>Produit vedette de la collection</TooltipContent>
											</Tooltip>
										) : (
											<Tooltip>
												<TooltipTrigger
													render={
														<Button
															variant="ghost"
															size="icon"
															className="size-8"
															onClick={() => handleSetFeatured(product.id, product.title)}
															aria-label="Definir comme vedette"
														/>
													}
												>
													<StarIcon className="text-muted-foreground size-5 transition-colors hover:text-yellow-400" />
												</TooltipTrigger>
												<TooltipContent>Definir comme produit vedette</TooltipContent>
											</Tooltip>
										)}
									</TableCell>

									{/* Image */}
									<TableCell>
										{primaryImage ? (
											<div className="bg-muted relative size-12 overflow-hidden rounded-md">
												<Image
													src={primaryImage.url}
													alt={primaryImage.altText ?? product.title}
													fill
													className="object-cover"
													sizes="48px"
													quality={IMAGE_QUALITY.THUMBNAIL}
												/>
											</div>
										) : (
											<div className="bg-muted flex size-12 items-center justify-center rounded-md">
												<PackageIcon className="text-muted-foreground size-5" />
											</div>
										)}
									</TableCell>

									{/* Titre du produit */}
									<TableCell>
										<div className="flex flex-col gap-1">
											<Link
												href={`/admin/catalogue/produits/${product.slug}`}
												className="font-medium hover:underline"
											>
												{product.title}
											</Link>
											{product.type && (
												<span className="text-muted-foreground text-xs">{product.type.label}</span>
											)}
										</div>
									</TableCell>

									{/* Statut. Plus d'avertissement « vedette non-PUBLIC » : le select ne
									    remonte que des produits PUBLIC et l'action serveur refuse tout
									    produit non publie — le cas est devenu impossible. */}
									<TableCell className="hidden sm:table-cell">
										<Badge variant={STATUS_CONFIG[product.status].variant}>
											{STATUS_CONFIG[product.status].label}
										</Badge>
									</TableCell>

									{/* Prix */}
									<TableCell className="hidden text-right md:table-cell">
										{price ? (
											<span className="font-medium">{formatEuro(price)}</span>
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
