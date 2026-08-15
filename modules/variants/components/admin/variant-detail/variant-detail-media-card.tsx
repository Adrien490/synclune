import { ImagesIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { VariantDetailReturn } from "@/modules/variants/data/get-variant";

interface VariantDetailMediaCardProps {
	variant: VariantDetailReturn;
}

/**
 * Schéma lean (lot 2) : le média vit sur le PRODUIT — cette carte montre la
 * vignette du produit parent et renvoie vers sa galerie.
 */
export function VariantDetailMediaCard({ variant }: VariantDetailMediaCardProps) {
	const image = variant.product.media[0] ?? null;

	return (
		<Card style={{ viewTransitionName: "variant-edit-media" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ImagesIcon className="size-5" aria-hidden="true" />
					Médias du produit
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{image ? (
					<div className="bg-muted relative aspect-square w-full max-w-xs overflow-hidden rounded-lg">
						<Image
							src={image.url}
							alt={image.alt ?? variant.product.name}
							fill
							sizes="(max-width: 640px) 100vw, 320px"
							className="object-cover"
						/>
					</div>
				) : (
					<p className="text-muted-foreground text-sm">
						Aucun média — les photos se gèrent sur la fiche produit.
					</p>
				)}
				<Button
					variant="outline"
					size="sm"
					render={<Link href={`/admin/catalogue/produits/${variant.product.slug}/modifier`} />}
				>
					Gérer les médias du produit
				</Button>
			</CardContent>
		</Card>
	);
}
