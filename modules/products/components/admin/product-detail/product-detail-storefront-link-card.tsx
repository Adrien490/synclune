"use client";

import { ArrowSquareOutIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";
import type { GetProductReturn } from "@/modules/products/types/product.types";

interface ProductDetailStorefrontLinkCardProps {
	slug: string;
	active: GetProductReturn["active"];
}

export function ProductDetailStorefrontLinkCard({
	slug,
	active,
}: ProductDetailStorefrontLinkCardProps) {
	const haptic = useHaptic();
	const isPublic = active;
	const isDraft = !active;

	return (
		<Card style={{ viewTransitionName: "product-detail-storefront" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{isPublic ? (
						<ArrowSquareOutIcon className="size-5" aria-hidden="true" />
					) : isDraft ? (
						<EyeIcon className="size-5" aria-hidden="true" />
					) : (
						<EyeSlashIcon className="size-5" aria-hidden="true" />
					)}
					Aperçu boutique
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{isPublic ? (
					<Button
						render={
							<Link
								href={`/creations/${slug}`}
								target="_blank"
								rel="noopener noreferrer"
								aria-label="Voir la fiche produit sur la boutique (nouvel onglet)"
								onClick={() => haptic("light")}
							/>
						}
						variant="outline"
						className="w-full touch-manipulation transition-transform duration-150 active:scale-[0.98]"
					>
						<ArrowSquareOutIcon className="size-4" aria-hidden="true" />
						Voir sur la boutique
					</Button>
				) : isDraft ? (
					<>
						<Button
							render={
								<Link
									href={`/creations/${slug}`}
									target="_blank"
									rel="noopener noreferrer"
									aria-label="Aperçu de la fiche produit en brouillon (nouvel onglet)"
									aria-describedby="storefront-link-help"
									onClick={() => haptic("light")}
								/>
							}
							variant="outline"
							className="w-full touch-manipulation transition-transform duration-150 active:scale-[0.98]"
						>
							<EyeIcon className="size-4" aria-hidden="true" />
							Aperçu (brouillon)
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
							<ArrowSquareOutIcon className="size-4" aria-hidden="true" />
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
