"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import {
	PRODUCT_TYPE_ITEM_DRAWER_ID,
	type ProductTypeItemDrawerData,
} from "./product-type-item-drawer";

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

	return (
		<button
			type="button"
			onClick={handleOpen}
			className="focus-visible:border-ring focus-visible:ring-ring/50 block w-full rounded-md text-left outline-none focus-visible:ring-[3px]"
			aria-label={`Ouvrir la fiche du type ${productType.label}`}
		>
			<Item
				variant="outline"
				size="sm"
				className="w-full gap-3"
				aria-roledescription="carte type de bijou"
			>
				<ItemContent className="min-w-0">
					<ItemTitle>
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
	);
}
