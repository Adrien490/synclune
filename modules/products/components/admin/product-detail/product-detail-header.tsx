"use client";

import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Ellipsis, Pencil } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useSetAdminPageTitle } from "@/app/admin/_components/admin-page-title-context";

import { useProductActions } from "../../../hooks/use-product-actions";

import { PRODUCT_STATUS_CONFIG } from "./product-detail-status.constants";
import { DetailStickyActionBar } from "@/shared/components/admin/detail-sticky-action-bar";
import { DetailHeaderShell } from "@/shared/components/admin/detail-header-shell";

interface ProductDetailHeaderProps {
	product: {
		id: string;
		slug: string;
		title: string;
		status: "DRAFT" | "PUBLIC" | "ARCHIVED";
		createdAt: Date;
		updatedAt: Date;
	};
}

export function ProductDetailHeader({ product }: ProductDetailHeaderProps) {
	const haptic = useHaptic();
	// Le header mobile affiche ce libellé plutôt que le slug Title-Casé.
	useSetAdminPageTitle(product.title);
	const status = PRODUCT_STATUS_CONFIG[product.status];
	const { sections } = useProductActions({
		productId: product.id,
		productSlug: product.slug,
		productTitle: product.title,
		productStatus: product.status,
	});

	return (
		<DetailHeaderShell>
			<div className="min-w-0">
				{/* Aucun lien de retour ici : `AdminMobileHeader` porte déjà le chevron
				    « Retour » + l'eyebrow « Produits » sur cette route. Les deux ensemble
				    faisaient trois affordances de retour empilées sur un même écran, et
				    aucune des ~10 autres ressources admin ne les duplique. */}
				<h1 className="font-display text-foreground text-xl leading-tight font-normal tracking-normal sm:text-3xl lg:text-4xl">
					{product.title}
				</h1>
				<div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs md:hidden">
					<Badge variant={status.variant} className="shrink-0">
						{status.label}
					</Badge>
					<span aria-hidden="true">·</span>
					<span className="truncate">
						Créé {formatDistanceToNow(product.createdAt, { addSuffix: true, locale: fr })}
					</span>
				</div>
				<p className="text-muted-foreground mt-1 hidden text-sm md:block">
					Créé le{" "}
					{format(product.createdAt, "d MMMM yyyy 'à' HH'h'mm", {
						locale: fr,
					})}
					<span className="text-muted-foreground">
						{" "}
						(mis à jour {formatDistanceToNow(product.updatedAt, { addSuffix: true, locale: fr })})
					</span>
				</p>
			</div>

			<DetailStickyActionBar>
				<Button
					render={
						<Link
							href={`/admin/catalogue/produits/${product.slug}/modifier`}
							onClick={() => haptic("light")}
						/>
					}
					size="sm"
					className="min-h-11 flex-1 touch-manipulation transition-transform duration-150 active:scale-[0.98] sm:min-h-9 md:flex-none"
				>
					<Pencil className="size-4" aria-hidden="true" />
					Modifier
				</Button>

				<ResponsiveActionMenu>
					<ResponsiveActionMenuTrigger
						render={
							<Button
								variant="outline"
								size="sm"
								aria-label="Plus d'actions"
								className="min-h-11 min-w-11 touch-manipulation sm:min-h-9 sm:min-w-9"
							/>
						}
					>
						<Ellipsis className="size-4" aria-hidden="true" />
					</ResponsiveActionMenuTrigger>
					<ResponsiveActionMenuContent
						title="Actions"
						description={product.title}
						sections={sections}
					/>
				</ResponsiveActionMenu>
			</DetailStickyActionBar>
		</DetailHeaderShell>
	);
}
