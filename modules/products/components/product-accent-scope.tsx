"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, type CSSProperties, type ReactNode } from "react";

import { resolveGalleryAccent } from "@/modules/media/services/gallery-accent.service";
import { parseGalleryParams } from "@/modules/media/schemas/gallery-params.schema";
import type { GetProductReturn } from "@/modules/products/types/product.types";

interface ProductAccentScopeProps {
	product: GetProductReturn;
	className?: string;
	children: ReactNode;
}

/**
 * Publie la teinte du bijou affiché dans `--piece-accent`, sur l'`<article>`.
 *
 * La couleur de la variante regardée est la seule couleur que la fiche possède
 * en propre. Elle était calculée par `gallery.tsx` et posée sur un unique
 * `<div>` : elle ne teintait donc que le carton de la galerie, alors que la
 * boutique vend des bijoux **colorés** et que la colonne d'achat, elle, était
 * intégralement grise. On remonte la variable d'un cran — la galerie, l'aplat
 * du prix, le nuancier et le CTA la lisent désormais tous depuis ce scope.
 *
 * **Pourquoi côté client, et pas côté serveur.** `page.tsx` dispose déjà des
 * variantes d'URL et pourrait calculer l'accent : mais les sélecteurs naviguent
 * en `router.replace`, donc un accent rendu par le serveur n'arriverait qu'après
 * l'aller-retour RSC, tandis que `ColorSelector` bascule sa pastille en
 * `useOptimistic`, c'est-à-dire immédiatement. La fiche se repeindrait après le
 * clic, pas avec lui. `useSearchParams` supprime ce décalage.
 *
 * **La normalisation reste dans le service.** `resolveGalleryAccent` ramène le
 * hex du catalogue en OKLCh borné (`L ∈ [0,62 ; 0,84]`, `C ≤ 0,16`) : c'est ce
 * plancher de clarté qui garantit qu'un texte en `--foreground` posé sur un
 * aplat d'accent reste au-dessus d'AA — 5,08:1 dans le pire cas atteignable.
 * D'où l'invariant que tout consommateur doit respecter : **l'accent est une
 * surface, jamais une encre.** Verrouillé par
 * `piece-accent-contrast.regression.test.ts`.
 *
 * `null` (bijou sans couleur exploitable, ou couleur achromatique) laisse la
 * variable absente : les consommateurs retombent alors sur `--primary`.
 */
export function ProductAccentScope({ product, className, children }: ProductAccentScopeProps) {
	return (
		<Suspense
			fallback={
				<article id="product-main" className={className}>
					{children}
				</article>
			}
		>
			<ProductAccentScopeInner product={product} className={className}>
				{children}
			</ProductAccentScopeInner>
		</Suspense>
	);
}

function ProductAccentScopeInner({ product, className, children }: ProductAccentScopeProps) {
	const searchParams = useSearchParams();

	const selectedVariants = parseGalleryParams({
		color: searchParams.get("color") ?? undefined,
		material: searchParams.get("material") ?? undefined,
		size: searchParams.get("size") ?? undefined,
		variant: searchParams.get("variant") ?? undefined,
	});

	const accent = resolveGalleryAccent({
		product,
		selectedVariants: {
			colorCombo: selectedVariants.variant,
			colorSlug: selectedVariants.color,
			materialSlug: selectedVariants.material,
			size: selectedVariants.size,
		},
	});

	return (
		<article
			id="product-main"
			className={className}
			style={accent ? ({ "--piece-accent": accent } as CSSProperties) : undefined}
		>
			{children}
		</article>
	);
}
