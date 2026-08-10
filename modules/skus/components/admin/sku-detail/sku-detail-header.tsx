"use client";

import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { DotsThreeIcon, PencilSimpleIcon, StarIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { CopyButton } from "@/shared/components/copy-button";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useSkuActions } from "@/modules/skus/hooks/use-sku-actions";
import type { SkuDetailReturn } from "@/modules/skus/data/get-sku";
import { getSkuMaterialsLabel } from "@/modules/skus/utils/sku-materials-label";
import { getSkuColorsDisplayLabel } from "@/modules/skus/utils/sku-colors-label";
import { useSetAdminPageTitle } from "@/app/admin/_components/admin-page-title-context";
import { DetailStickyActionBar } from "@/shared/components/admin/detail-sticky-action-bar";
import { DetailHeaderShell } from "@/shared/components/admin/detail-header-shell";

interface SkuDetailHeaderProps {
	sku: SkuDetailReturn;
}

function buildVariantLabel(sku: SkuDetailReturn): string {
	const parts: string[] = [];
	const colorsLabel = getSkuColorsDisplayLabel(sku.colors);
	if (colorsLabel) parts.push(colorsLabel);
	const materialsLabel = getSkuMaterialsLabel(sku.materials);
	if (materialsLabel) parts.push(materialsLabel);
	if (sku.size) parts.push(sku.size);
	return parts.join(" · ");
}

export function SkuDetailHeader({ sku }: SkuDetailHeaderProps) {
	// Titre lisible pour le header mobile (sinon : id opaque Title-Casé).
	useSetAdminPageTitle(sku.sku);
	const haptic = useHaptic();
	const { sections } = useSkuActions({
		skuId: sku.id,
		skuName: sku.sku,
		productSlug: sku.product.slug,
		isRepresentative: sku.isRepresentative,
		isActive: sku.isActive,
		inventory: sku.inventory,
		priceInclTax: sku.priceInclTax,
		compareAtPrice: sku.compareAtPrice,
	});

	const subtitle = buildVariantLabel(sku);

	return (
		<DetailHeaderShell>
			<div className="min-w-0 space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					<h1 className="font-display text-foreground text-xl leading-tight font-normal tracking-normal break-all sm:text-3xl lg:text-4xl">
						{sku.sku}
					</h1>
					<CopyButton
						text={sku.sku}
						label="Référence variante"
						className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
					/>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{sku.isRepresentative ? (
						<Badge variant="secondary">
							<StarIcon className="size-3" aria-hidden="true" />
							Par défaut
						</Badge>
					) : null}
					{!sku.isActive ? <Badge variant="outline">Inactive</Badge> : null}
					{subtitle ? <span className="text-muted-foreground text-sm">{subtitle}</span> : null}
				</div>
				<p className="text-muted-foreground hidden text-sm md:block">
					Créée le {format(sku.createdAt, "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
					<span className="text-muted-foreground">
						{" "}
						(mise à jour {formatDistanceToNow(sku.updatedAt, { addSuffix: true, locale: fr })})
					</span>
				</p>
			</div>

			<DetailStickyActionBar>
				<Button
					render={
						<Link
							href={`/admin/catalogue/produits/${sku.product.slug}/variantes/${sku.id}/modifier`}
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
						description={sku.sku}
						sections={sections}
					/>
				</ResponsiveActionMenu>
			</DetailStickyActionBar>
		</DetailHeaderShell>
	);
}
