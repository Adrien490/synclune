"use client";

import { LongPressMenuLink } from "@/shared/components/long-press-menu-link";
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";

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
	const statusLabel = productType.isActive ? "Actif" : "Inactif";

	const { sections } = useProductTypeActions({
		productTypeId: productType.id,
		isSystem: productType.isSystem,
		label: productType.label,
		description: productType.description,
		slug: productType.slug,
		productsCount,
	});

	return (
		<LongPressMenuLink
			href={`/admin/catalogue/types-de-produits/${productType.slug}/modifier`}
			ariaLabel={`Type de bijou ${productType.label}`}
			sections={sections}
			menuTitle="Actions"
			menuDescription={productType.label}
			className="text-left"
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
		</LongPressMenuLink>
	);
}
