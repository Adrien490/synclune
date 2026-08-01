"use client";

import { ArrowRight, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";
import {
	PRODUCT_STATUS_LABELS,
	PRODUCT_STATUS_VARIANTS,
} from "@/modules/products/constants/product-status-display";
import type { SkuDetailReturn } from "@/modules/skus/data/get-sku";

interface SkuDetailParentProductCardProps {
	sku: SkuDetailReturn;
}

export function SkuDetailParentProductCard({ sku }: SkuDetailParentProductCardProps) {
	const haptic = useHaptic();
	const parentImage = sku.product.skus[0]?.images[0] ?? null;
	const variantsCount = sku.product._count.skus;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Package className="size-5" aria-hidden="true" />
					Produit parent
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center gap-3">
					{parentImage ? (
						<Image
							src={parentImage.url}
							alt={parentImage.altText ?? sku.product.title}
							width={56}
							height={56}
							sizes="56px"
							className="size-14 shrink-0 rounded-md border object-cover"
							{...(parentImage.blurDataUrl
								? { placeholder: "blur" as const, blurDataURL: parentImage.blurDataUrl }
								: {})}
						/>
					) : (
						<div className="bg-muted flex size-14 shrink-0 items-center justify-center rounded-md border">
							<Package className="text-muted-foreground size-5" aria-hidden="true" />
						</div>
					)}
					<div className="min-w-0 space-y-1">
						<p className="text-foreground truncate text-sm font-medium">{sku.product.title}</p>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant={PRODUCT_STATUS_VARIANTS[sku.product.status]}>
								{PRODUCT_STATUS_LABELS[sku.product.status]}
							</Badge>
							<span className="text-muted-foreground text-xs">
								{variantsCount} variante{variantsCount > 1 ? "s" : ""}
							</span>
						</div>
					</div>
				</div>

				{sku.product.status === "ARCHIVED" ? (
					<p className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-3 text-xs">
						Le produit parent est archivé : cette variante n&apos;est pas vendable.
					</p>
				) : null}

				<Button
					asChild
					variant="outline"
					className="w-full transition-transform duration-150 active:scale-[0.98]"
				>
					<Link
						href={`/admin/catalogue/produits/${sku.product.slug}`}
						onClick={() => haptic("light")}
					>
						Voir le produit
						<ArrowRight className="size-4" aria-hidden="true" />
					</Link>
				</Button>
			</CardContent>
		</Card>
	);
}
