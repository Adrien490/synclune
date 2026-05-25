"use client";

import { Loader2, Tag } from "lucide-react";

import { MobileSelectableCard } from "@/shared/components/mobile-selection";
import { Badge } from "@/shared/components/ui/badge";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@/shared/components/ui/item";
import { ADMIN_PENDING_LABELS } from "@/shared/constants/admin-pending-labels";
import { useAdminListPendingContextOptional } from "@/shared/contexts/admin-list-pending-context";
import { cn } from "@/shared/utils/cn";

import { useProductTypeActions } from "../../hooks/use-product-type-actions";

interface ProductTypeMobileItemProps {
	productType: {
		id: string;
		label: string;
		slug: string;
		description: string | null;
		isActive: boolean;
		isSystem: boolean;
		_count: { products: number };
	};
}

export function ProductTypeMobileItem({ productType }: ProductTypeMobileItemProps) {
	const productsCount = productType._count.products || 0;
	const statusLabel = productType.isActive ? "● Actif" : "○ Inactif";
	const pendingCtx = useAdminListPendingContextOptional();
	const isPendingItem = pendingCtx?.isPending(productType.id) ?? false;
	const pendingKind = pendingCtx?.pendingKind ?? null;
	// Items système ne sont jamais affectés par le bulk (filtrés serveur).
	const showPending = isPendingItem && !productType.isSystem;
	const pendingLabel = showPending ? ADMIN_PENDING_LABELS[pendingKind ?? "status"] : null;

	const { sections } = useProductTypeActions({
		productTypeId: productType.id,
		isSystem: productType.isSystem,
		label: productType.label,
		description: productType.description,
		slug: productType.slug,
		productsCount,
	});

	return (
		<MobileSelectableCard
			id={productType.id}
			itemLabel={`Type de bijou ${productType.label}, ${statusLabel}${productType.isSystem ? ", système" : ""}, ${productsCount} produit${productsCount !== 1 ? "s" : ""}`}
			longPressProps={{
				href: `/admin/catalogue/types-de-produits/${productType.slug}`,
				ariaLabel: `Type de bijou ${productType.label}`,
				sections,
				menuTitle: "Actions",
				menuDescription: productType.label,
				className: "text-left",
				viewTransitionName: `product-type-card-${productType.id}`,
			}}
		>
			<Item
				variant="outline"
				size="sm"
				className={cn("w-full gap-3 motion-safe:transition-opacity", showPending && "opacity-60")}
				aria-roledescription="carte type de produit"
				aria-busy={showPending || undefined}
			>
				<ItemMedia variant="icon">
					<Tag
						className="text-muted-foreground size-5"
						aria-hidden="true"
						style={{ viewTransitionName: `product-type-icon-${productType.id}` }}
					/>
				</ItemMedia>
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span className="min-w-0 flex-1 truncate font-semibold">{productType.label}</span>
						{showPending ? (
							<Badge
								variant="secondary"
								style={{ viewTransitionName: `product-type-status-${productType.id}` }}
							>
								<Loader2 className="size-3 motion-safe:animate-spin" aria-hidden="true" />
								{pendingLabel}
							</Badge>
						) : (
							<Badge
								variant={productType.isActive ? "default" : "secondary"}
								style={{ viewTransitionName: `product-type-status-${productType.id}` }}
							>
								{statusLabel}
							</Badge>
						)}
						{productType.isSystem ? <Badge variant="outline">Système</Badge> : null}
					</ItemTitle>
					{productType.description ? (
						<ItemDescription className="line-clamp-1">{productType.description}</ItemDescription>
					) : null}
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span>
							{productsCount} produit{productsCount !== 1 ? "s" : ""}
						</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</MobileSelectableCard>
	);
}
