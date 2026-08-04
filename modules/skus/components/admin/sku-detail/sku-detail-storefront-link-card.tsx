"use client";

import { ExternalLink, EyeOff } from "lucide-react";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";
import type { SkuDetailReturn } from "@/modules/skus/data/get-sku";

interface SkuDetailStorefrontLinkCardProps {
	sku: SkuDetailReturn;
}

function getDisabledReason(sku: SkuDetailReturn): string | null {
	if (sku.product.status !== "PUBLIC") {
		return sku.product.status === "DRAFT"
			? "Le produit parent est en brouillon et n'est pas visible publiquement."
			: "Le produit parent est archivé et n'est pas visible publiquement.";
	}
	if (!sku.isActive) {
		return "Cette variante est désactivée et n'est pas vendable en ligne.";
	}
	if (sku.inventory <= 0) {
		return "Cette variante est en rupture de stock.";
	}
	return null;
}

export function SkuDetailStorefrontLinkCard({ sku }: SkuDetailStorefrontLinkCardProps) {
	const haptic = useHaptic();
	const disabledReason = getDisabledReason(sku);
	const isVisible = !disabledReason;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{isVisible ? (
						<ExternalLink className="size-5" aria-hidden="true" />
					) : (
						<EyeOff className="size-5" aria-hidden="true" />
					)}
					Aperçu boutique
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{isVisible ? (
					<Button
						render={
							<Link
								href={`/creations/${sku.product.slug}?sku=${sku.id}`}
								target="_blank"
								rel="noopener noreferrer"
								aria-label="Voir cette variante sur la boutique (nouvel onglet)"
								onClick={() => haptic("light")}
							/>
						}
						variant="outline"
						className="w-full transition-transform duration-150 active:scale-[0.98]"
					>
						<ExternalLink className="size-4" aria-hidden="true" />
						Voir sur la boutique
					</Button>
				) : (
					<>
						<Button
							variant="outline"
							className="w-full"
							disabled
							aria-describedby="sku-storefront-help"
						>
							<ExternalLink className="size-4" aria-hidden="true" />
							Voir sur la boutique
						</Button>
						<p id="sku-storefront-help" className="text-muted-foreground text-xs">
							{disabledReason}
						</p>
					</>
				)}
			</CardContent>
		</Card>
	);
}
