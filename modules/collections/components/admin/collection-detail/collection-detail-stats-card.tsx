import { ChartBarIcon, StarIcon } from "@phosphor-icons/react/ssr";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import Image from "next/image";

import { ProductStatus } from "@/app/generated/prisma/enums";
import type { GetCollectionReturn } from "@/modules/collections/types/collection.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface CollectionDetailStatsCardProps {
	collection: GetCollectionReturn;
}

export function CollectionDetailStatsCard({ collection }: CollectionDetailStatsCardProps) {
	const products = collection.products;
	// _count.products is filtered to PUBLIC + reflects the real total even when
	// the products array is capped (GET_COLLECTION_PRODUCTS_LIMIT).
	const total = collection._count.products;
	const publicCount = products.filter((pc) => pc.product.status === ProductStatus.PUBLIC).length;
	const featured = products.find((pc) => pc.isFeatured);
	const featuredImage =
		featured?.product.skus[0]?.images.find((i) => i.isPrimary) ??
		featured?.product.skus[0]?.images[0] ??
		null;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ChartBarIcon className="size-5" aria-hidden="true" />
					Statistiques
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<dl className="grid gap-3 text-sm">
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Produits totaux</dt>
						<dd className="font-medium">{total}</dd>
					</div>
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Publics</dt>
						<dd className="font-medium">{publicCount}</dd>
					</div>
				</dl>

				<div className="space-y-2 border-t pt-4">
					<h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
						Produit vedette
					</h3>
					{featured ? (
						<div className="flex items-center gap-3">
							{featuredImage ? (
								<Image
									src={featuredImage.url}
									alt={featuredImage.altText ?? featured.product.title}
									width={48}
									height={48}
									sizes="48px"
									quality={IMAGE_QUALITY.THUMBNAIL}
									className="size-12 shrink-0 rounded-md border object-cover"
									{...(featuredImage.blurDataUrl
										? { placeholder: "blur" as const, blurDataURL: featuredImage.blurDataUrl }
										: {})}
								/>
							) : (
								<div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-md border">
									<StarIcon className="text-muted-foreground size-5" aria-hidden="true" />
								</div>
							)}
							<div className="min-w-0">
								<p className="text-foreground truncate text-sm font-medium">
									{featured.product.title}
								</p>
								<p className="text-muted-foreground text-xs">Mis en avant</p>
							</div>
						</div>
					) : (
						<p className="text-muted-foreground text-sm italic">Aucun produit vedette défini.</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
