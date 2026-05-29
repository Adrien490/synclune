"use client";

import { ExternalLink, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";
import type { GetProductReturn } from "@/modules/products/types/product.types";

interface ProductDetailStorefrontLinkCardProps {
	slug: string;
	status: GetProductReturn["status"];
}

export function ProductDetailStorefrontLinkCard({
	slug,
	status,
}: ProductDetailStorefrontLinkCardProps) {
	const haptic = useHaptic();
	const isPublic = status === "PUBLIC";
	const isDraft = status === "DRAFT";

	return (
		<Card style={{ viewTransitionName: "product-detail-storefront" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{isPublic ? (
						<ExternalLink className="size-5" aria-hidden="true" />
					) : isDraft ? (
						<Eye className="size-5" aria-hidden="true" />
					) : (
						<EyeOff className="size-5" aria-hidden="true" />
					)}
					Aperçu boutique
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{isPublic ? (
					<Button
						asChild
						variant="outline"
						className="w-full touch-manipulation transition-transform duration-150 active:scale-[0.98]"
					>
						<Link
							href={`/creations/${slug}`}
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Voir la fiche produit sur la boutique (nouvel onglet)"
							onClick={() => haptic("light")}
						>
							<ExternalLink className="size-4" aria-hidden="true" />
							Voir sur la boutique
						</Link>
					</Button>
				) : isDraft ? (
					<>
						<Button
							asChild
							variant="outline"
							className="w-full touch-manipulation transition-transform duration-150 active:scale-[0.98]"
						>
							<Link
								href={`/creations/${slug}`}
								target="_blank"
								rel="noopener noreferrer"
								aria-label="Aperçu de la fiche produit en brouillon (nouvel onglet)"
								aria-describedby="storefront-link-help"
								onClick={() => haptic("light")}
							>
								<Eye className="size-4" aria-hidden="true" />
								Aperçu (brouillon)
							</Link>
						</Button>
						<p id="storefront-link-help" className="text-muted-foreground text-xs">
							Ce produit est en brouillon : l'aperçu n'est visible que par les administrateurs
							connectés.
						</p>
					</>
				) : (
					<>
						<Button
							variant="outline"
							className="w-full"
							disabled
							aria-describedby="storefront-link-help"
						>
							<ExternalLink className="size-4" aria-hidden="true" />
							Voir sur la boutique
						</Button>
						<p id="storefront-link-help" className="text-muted-foreground text-xs">
							Ce produit est archivé et n'est pas visible publiquement.
						</p>
					</>
				)}
			</CardContent>
		</Card>
	);
}
