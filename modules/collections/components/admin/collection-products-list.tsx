"use client";

import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import { Badge } from "@/shared/components/ui/badge";
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
import { formatEuro } from "@/shared/utils/format-euro";
import { PackageIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";
import type { GetCollectionReturn } from "../../types/collection.types";

interface CollectionProductsListProps {
	collectionId: string;
	collectionSlug: string;
	products: GetCollectionReturn["products"];
}

/**
 * Liste des produits d'une collection — schéma lean (lot 2) : M-N implicite,
 * plus de vedette éditoriale (le tri est chronologique), média sur le PRODUIT.
 */
export function CollectionProductsList({ products }: CollectionProductsListProps) {
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
							<TableHead className="w-20">Image</TableHead>
							<TableHead>Produit</TableHead>
							<TableHead className="hidden sm:table-cell">Statut</TableHead>
							<TableHead className="hidden text-right md:table-cell">Prix</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{products.map((product) => {
							const primaryImage = product.media[0];
							const defaultVariant = product.variants[0];
							const price = defaultVariant?.priceCents ?? product.priceCents;

							return (
								<TableRow key={product.id}>
									{/* Image */}
									<TableCell>
										{primaryImage ? (
											<div className="bg-muted relative size-12 overflow-hidden rounded-md">
												<Image
													src={primaryImage.url}
													alt={primaryImage.alt ?? product.name}
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
												{product.name}
											</Link>
										</div>
									</TableCell>

									{/* Statut */}
									<TableCell className="hidden sm:table-cell">
										<Badge variant={product.active ? "default" : "secondary"}>
											{product.active ? "En vente" : "Brouillon"}
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
