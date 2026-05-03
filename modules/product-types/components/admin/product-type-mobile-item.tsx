"use client";

import { useState } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { useLongPress } from "@/shared/hooks";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";

import {
	PRODUCT_TYPE_ITEM_DRAWER_ID,
	type ProductTypeItemDrawerData,
} from "./product-type-item-drawer";
import { ProductTypeRowActions } from "./product-type-row-actions";

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
	const { open } = useDialog<ProductTypeItemDrawerData>(PRODUCT_TYPE_ITEM_DRAWER_ID);
	const haptic = useHaptic();
	const productsCount = productType._count.products || 0;
	const statusLabel = productType.isActive ? "Actif" : "Inactif";

	const [menuOpen, setMenuOpen] = useState(false);

	const handleOpen = () => {
		haptic("selection");
		open({
			productType: {
				id: productType.id,
				label: productType.label,
				slug: productType.slug,
				description: productType.description,
				isActive: productType.isActive,
				isSystem: productType.isSystem,
				productsCount,
			},
		});
	};

	const { bind } = useLongPress(() => setMenuOpen(true), { onClick: handleOpen });

	return (
		<>
			<button
				type="button"
				aria-label={`Type de bijou ${productType.label}`}
				{...bind}
				className={cn(
					"focus-visible:ring-primary w-full rounded-lg text-left",
					"focus-visible:ring-2 focus-visible:outline-none",
				)}
			>
				<Item
					variant="outline"
					size="sm"
					className="w-full gap-3"
					aria-roledescription="carte type de bijou"
				>
					<ItemContent className="min-w-0">
						<ItemTitle className="w-full min-w-0 flex-wrap">
							<span className="truncate font-semibold">{productType.label}</span>
							<Badge variant={productType.isActive ? "default" : "secondary"}>{statusLabel}</Badge>
							{productType.isSystem ? <Badge variant="outline">Systeme</Badge> : null}
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
			</button>
			<ProductTypeRowActions
				productTypeId={productType.id}
				isSystem={productType.isSystem}
				label={productType.label}
				description={productType.description}
				slug={productType.slug}
				productsCount={productsCount}
				open={menuOpen}
				onOpenChange={setMenuOpen}
				hideTrigger
			/>
		</>
	);
}
