"use client";

import { ArrowRightIcon, PackageIcon } from "@phosphor-icons/react/ssr";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";
import type { VariantDetailReturn } from "@/modules/variants/data/get-variant";

interface VariantDetailParentProductCardProps {
	variant: VariantDetailReturn;
}

export function VariantDetailParentProductCard({ variant }: VariantDetailParentProductCardProps) {
	const haptic = useHaptic();
	const parentImage = variant.product.media[0] ?? null;
	const variantsCount = variant.product._count.variants;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<PackageIcon className="size-5" aria-hidden="true" />
					Produit parent
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center gap-3">
					{parentImage ? (
						<Image
							src={parentImage.url}
							alt={parentImage.alt ?? variant.product.name}
							width={56}
							height={56}
							sizes="56px"
							quality={IMAGE_QUALITY.THUMBNAIL}
							className="size-14 shrink-0 rounded-md border object-cover"
						/>
					) : (
						<div className="bg-muted flex size-14 shrink-0 items-center justify-center rounded-md border">
							<PackageIcon className="text-muted-foreground size-5" aria-hidden="true" />
						</div>
					)}
					<div className="min-w-0 space-y-1">
						<p className="text-foreground truncate text-sm font-medium">{variant.product.name}</p>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant={variant.product.active ? "default" : "outline"}>
								{variant.product.active ? "En vente" : "Masqué"}
							</Badge>
							<span className="text-muted-foreground text-xs">
								{variantsCount} variante{variantsCount > 1 ? "s" : ""}
							</span>
						</div>
					</div>
				</div>

				{!variant.product.active ? (
					<p className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-3 text-xs">
						Le produit parent est masqué : cette variante n&apos;est pas vendable.
					</p>
				) : null}

				<Button
					render={
						<Link
							href={`/admin/catalogue/produits/${variant.product.slug}`}
							onClick={() => haptic("light")}
						/>
					}
					variant="outline"
					className="w-full transition-transform duration-150 active:scale-[0.98]"
				>
					Voir le produit
					<ArrowRightIcon className="size-4" aria-hidden="true" />
				</Button>
			</CardContent>
		</Card>
	);
}
