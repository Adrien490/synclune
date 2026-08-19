"use client";

import { ArrowSquareOutIcon, EyeSlashIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { slugify } from "@/shared/utils/generate-slug";
import type { VariantDetailReturn } from "@/modules/variants/data/get-variant";

interface VariantDetailStorefrontLinkCardProps {
	variant: VariantDetailReturn;
}

/**
 * URL vitrine PRÉ-SÉLECTIONNANT la variante.
 *
 * ⚠️ Le lien pointait sur `?variant=<id>` — un paramètre que plus rien ne lit
 * depuis la migration lean (le combo M2M a disparu, `matchColor` ne l'a jamais
 * résolu) : le bouton ouvrait toujours la fiche sur la variante par défaut.
 * Les sélecteurs de la fiche écrivent `?color` / `?material` / `?size`, et
 * l'identité URL d'une couleur est son NOM SLUGIFIÉ (Color n'a pas de colonne
 * slug) — d'où `slugify` des deux côtés, comme `matchColor`/`matchMaterial`.
 */
function buildStorefrontHref(variant: VariantDetailReturn): string {
	const params = new URLSearchParams();
	if (variant.color) params.set("color", slugify(variant.color.name));
	if (variant.material) params.set("material", slugify(variant.material.name));
	if (variant.size) params.set("size", variant.size);
	const query = params.toString();
	return `/creations/${variant.product.slug}${query ? `?${query}` : ""}`;
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
								href={buildStorefrontHref(variant)}
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
