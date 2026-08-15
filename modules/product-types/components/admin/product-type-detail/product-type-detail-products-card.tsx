"use client";

import { ArrowRightIcon, PackageIcon } from "@phosphor-icons/react/ssr";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import Image from "next/image";
import Link from "next/link";

import type { ProductTypeDetailReturn } from "@/modules/product-types/data/get-product-type";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";

interface ProductTypeDetailProductsCardProps {
	productType: ProductTypeDetailReturn;
}

export function ProductTypeDetailProductsCard({ productType }: ProductTypeDetailProductsCardProps) {
	const haptic = useHaptic();
	const products = productType.products;
	const total = productType._count.products;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between gap-2">
					<span className="flex items-center gap-2">
						<PackageIcon className="size-5" aria-hidden="true" />
						Produits
					</span>
					<span className="text-muted-foreground text-sm font-normal">
						{total} produit{total > 1 ? "s" : ""}
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{products.length === 0 ? (
					<p className="text-muted-foreground text-sm italic">
						Aucun produit n&apos;utilise ce type pour le moment.
					</p>
				) : (
					<ul className="-mx-2 space-y-1" aria-label={`${products.length} produit(s) récents`}>
						{products.map((product) => {
							const image = product.media[0] ?? null;
							return (
								<li key={product.id}>
									<Link
										href={`/admin/catalogue/produits/${product.slug}`}
										onClick={() => haptic("light")}
										className="hover:bg-muted/40 active:bg-muted/60 focus-visible:ring-ring flex items-center gap-3 rounded-md px-2 py-2 transition-colors outline-none focus-visible:ring-2"
									>
										{image ? (
											<Image
												src={image.url}
												alt={image.alt ?? product.name}
												width={40}
												height={40}
												sizes="40px"
												quality={IMAGE_QUALITY.THUMBNAIL}
												className="size-10 shrink-0 rounded-md border object-cover"
											/>
										) : (
											<div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md border">
												<PackageIcon className="text-muted-foreground size-4" aria-hidden="true" />
											</div>
										)}
										<div className="min-w-0 flex-1">
											<p className="text-foreground truncate text-sm font-medium">{product.name}</p>
										</div>
										<Badge variant={product.active ? "default" : "secondary"}>
											{product.active ? "En vente" : "Brouillon"}
										</Badge>
									</Link>
								</li>
							);
						})}
					</ul>
				)}

				<Button
					render={
						<Link
							href={`/admin/catalogue/produits?filter_typeId=${productType.slug}`}
							onClick={() => haptic("light")}
						/>
					}
					variant="outline"
					className="w-full transition-transform duration-150 active:scale-[0.98]"
				>
					Voir tous les produits
					<ArrowRightIcon className="size-4" aria-hidden="true" />
				</Button>
			</CardContent>
		</Card>
	);
}
