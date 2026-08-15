"use client";

import { ArrowSquareOutIcon, EyeSlashIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";
import type { VariantDetailReturn } from "@/modules/variants/data/get-variant";

interface VariantDetailStorefrontLinkCardProps {
	variant: VariantDetailReturn;
}

function getDisabledReason(variant: VariantDetailReturn): string | null {
	if (!variant.product.active) {
		return "Le produit parent est masqué et n'est pas visible publiquement.";
	}
	if (!variant.active) {
		return "Cette variante est désactivée et n'est pas vendable en ligne.";
	}
	if (variant.stock <= 0) {
		return "Cette variante est en rupture de stock.";
	}
	return null;
}

export function VariantDetailStorefrontLinkCard({ variant }: VariantDetailStorefrontLinkCardProps) {
	const haptic = useHaptic();
	const disabledReason = getDisabledReason(variant);
	const isVisible = !disabledReason;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{isVisible ? (
						<ArrowSquareOutIcon className="size-5" aria-hidden="true" />
					) : (
						<EyeSlashIcon className="size-5" aria-hidden="true" />
					)}
					Aperçu boutique
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{isVisible ? (
					<Button
						render={
							<Link
								href={`/creations/${variant.product.slug}?variant=${variant.id}`}
								target="_blank"
								rel="noopener noreferrer"
								aria-label="Voir cette variante sur la boutique (nouvel onglet)"
								onClick={() => haptic("light")}
							/>
						}
						variant="outline"
						className="w-full transition-transform duration-150 active:scale-[0.98]"
					>
						<ArrowSquareOutIcon className="size-4" aria-hidden="true" />
						Voir sur la boutique
					</Button>
				) : (
					<>
						<Button
							variant="outline"
							className="w-full"
							disabled
							aria-describedby="variant-storefront-help"
						>
							<ArrowSquareOutIcon className="size-4" aria-hidden="true" />
							Voir sur la boutique
						</Button>
						<p id="variant-storefront-help" className="text-muted-foreground text-xs">
							{disabledReason}
						</p>
					</>
				)}
			</CardContent>
		</Card>
	);
}
