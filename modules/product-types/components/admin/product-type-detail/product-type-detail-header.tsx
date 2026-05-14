"use client";

import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Ellipsis, Lock, Pencil } from "lucide-react";
import Link from "next/link";

import { useProductTypeActions } from "@/modules/product-types/hooks/use-product-type-actions";
import type { ProductTypeDetailReturn } from "@/modules/product-types/data/get-product-type";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useHaptic } from "@/shared/hooks/use-haptic";

interface ProductTypeDetailHeaderProps {
	productType: ProductTypeDetailReturn;
}

export function ProductTypeDetailHeader({ productType }: ProductTypeDetailHeaderProps) {
	const haptic = useHaptic();
	const { sections } = useProductTypeActions({
		productTypeId: productType.id,
		isSystem: productType.isSystem,
		label: productType.label,
		description: productType.description,
		slug: productType.slug,
		productsCount: productType._count.products,
	});

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div className="min-w-0">
				<h1 className="font-display text-foreground text-xl leading-tight font-normal tracking-normal sm:text-3xl lg:text-4xl">
					{productType.label}
				</h1>
				<div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs md:hidden">
					<Badge
						variant={productType.isActive ? "default" : "secondary"}
						className="shrink-0"
						style={{ viewTransitionName: `product-type-status-${productType.id}` }}
					>
						{productType.isActive ? "Actif" : "Inactif"}
					</Badge>
					{productType.isSystem ? (
						<Badge variant="outline" className="shrink-0">
							<Lock className="size-3" aria-hidden="true" />
							Système
						</Badge>
					) : null}
					<span aria-hidden="true">·</span>
					<span className="truncate">
						Créé {formatDistanceToNow(productType.createdAt, { addSuffix: true, locale: fr })}
					</span>
				</div>
				<p className="text-muted-foreground mt-1 hidden text-sm md:block">
					Créé le {format(productType.createdAt, "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
					<span className="text-muted-foreground/70">
						{" "}
						(mis à jour{" "}
						{formatDistanceToNow(productType.updatedAt, { addSuffix: true, locale: fr })})
					</span>
				</p>
			</div>

			<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-[var(--admin-main-x,1.5rem)] flex items-center gap-2 border-t px-[var(--admin-main-x,1.5rem)] py-3 backdrop-blur-md md:static md:m-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
				<Button
					asChild
					size="sm"
					className="min-h-11 flex-1 touch-manipulation transition-transform duration-150 active:scale-[0.98] sm:min-h-9 md:flex-none"
					disabled={productType.isSystem}
				>
					<Link
						href={
							productType.isSystem
								? "#"
								: `/admin/catalogue/types-de-produits/${productType.slug}/modifier`
						}
						aria-disabled={productType.isSystem || undefined}
						onClick={(event) => {
							if (productType.isSystem) {
								event.preventDefault();
								return;
							}
							haptic("light");
						}}
					>
						<Pencil className="size-4" aria-hidden="true" />
						Modifier
					</Link>
				</Button>

				<ResponsiveActionMenu>
					<ResponsiveActionMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							aria-label="Plus d'actions"
							className="min-h-11 min-w-11 touch-manipulation sm:min-h-9 sm:min-w-9"
						>
							<Ellipsis className="size-4" aria-hidden="true" />
						</Button>
					</ResponsiveActionMenuTrigger>
					<ResponsiveActionMenuContent
						title="Actions type"
						description={productType.label}
						sections={sections}
					/>
				</ResponsiveActionMenu>
			</div>
		</div>
	);
}
