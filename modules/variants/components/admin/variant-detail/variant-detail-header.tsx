"use client";

import { DotsThreeIcon, PencilSimpleIcon, StarIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useVariantActions } from "@/modules/variants/hooks/use-variant-actions";
import type { VariantDetailReturn } from "@/modules/variants/data/get-variant";
import { getVariantDisplayTitle } from "@/modules/variants/utils/variant-labels";
import { useSetAdminPageTitle } from "@/app/admin/(protected)/_components/admin-page-title-context";
import { DetailStickyActionBar } from "@/shared/components/admin/detail-sticky-action-bar";
import { DetailHeaderShell } from "@/shared/components/admin/detail-header-shell";

interface VariantDetailHeaderProps {
	variant: VariantDetailReturn;
}

export function VariantDetailHeader({ variant }: VariantDetailHeaderProps) {
	const title = getVariantDisplayTitle({
		color: variant.color,
		material: variant.material,
		size: variant.size,
		isRepresentative: variant.isRepresentative,
	});
	// Titre lisible pour le header mobile (sinon : id opaque Title-Casé).
	useSetAdminPageTitle(title);
	const haptic = useHaptic();
	const { sections } = useVariantActions({
		variantId: variant.id,
		variantName: title,
		productSlug: variant.product.slug,
		isRepresentative: variant.isRepresentative,
		active: variant.active,
		stock: variant.stock,
		priceCents: variant.priceCents,
		productPriceCents: variant.product.priceCents,
	});

	return (
		<DetailHeaderShell>
			<div className="min-w-0 space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					<h1 className="font-display text-foreground text-xl leading-tight font-normal tracking-normal sm:text-3xl lg:text-4xl">
						{title}
					</h1>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{variant.isRepresentative ? (
						<Badge variant="secondary">
							<StarIcon className="size-3" aria-hidden="true" />
							Par défaut
						</Badge>
					) : null}
					{!variant.active ? <Badge variant="outline">Inactive</Badge> : null}
					<span className="text-muted-foreground text-sm">{variant.product.name}</span>
				</div>
			</div>

			<DetailStickyActionBar>
				<Button
					render={
						<Link
							href={`/admin/catalogue/produits/${variant.product.slug}/variantes/${variant.id}/modifier`}
							onClick={() => haptic("light")}
						/>
					}
					size="sm"
					className="min-h-11 flex-1 transition-transform duration-150 active:scale-[0.98] sm:min-h-9 md:flex-none"
				>
					<PencilSimpleIcon className="size-4" aria-hidden="true" />
					Modifier
				</Button>

				<ResponsiveActionMenu>
					<ResponsiveActionMenuTrigger
						render={
							<Button
								variant="outline"
								size="sm"
								aria-label="Plus d'actions"
								className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
							/>
						}
					>
						<DotsThreeIcon className="size-4" aria-hidden="true" />
					</ResponsiveActionMenuTrigger>
					<ResponsiveActionMenuContent
						title="Actions variante"
						description={title}
						sections={sections}
					/>
				</ResponsiveActionMenu>
			</DetailStickyActionBar>
		</DetailHeaderShell>
	);
}
