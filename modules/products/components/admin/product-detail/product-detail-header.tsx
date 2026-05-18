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

import { useProductActions } from "../../../hooks/use-product-actions";

import { PRODUCT_STATUS_CONFIG } from "./product-detail-status.constants";

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
	const status = PRODUCT_STATUS_CONFIG[product.status];
	const { sections } = useProductActions({
		productId: product.id,
		productSlug: product.slug,
		productTitle: product.title,
		productStatus: product.status,
	});

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div className="min-w-0">
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

			<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-[var(--admin-main-x,1.5rem)] flex items-center gap-2 border-t px-[var(--admin-main-x,1.5rem)] py-3 backdrop-blur-md md:static md:m-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
				<Button
					asChild
					size="sm"
					className="min-h-11 flex-1 touch-manipulation transition-transform duration-150 active:scale-[0.98] sm:min-h-9 md:flex-none"
				>
					<Link
						href={`/admin/catalogue/produits/${product.slug}/modifier`}
						onClick={() => haptic("light")}
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
						title="Actions"
						description={product.title}
						sections={sections}
					/>
				</ResponsiveActionMenu>
			</div>
		</div>
	);
}
