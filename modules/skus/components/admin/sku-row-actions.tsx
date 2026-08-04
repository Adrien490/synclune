"use client";

import { DotsThreeVerticalIcon } from "@phosphor-icons/react/ssr";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";

import { useSkuActions } from "../../hooks/use-sku-actions";

interface ProductSkuRowActionsProps {
	skuId: string;
	skuName: string;
	productSlug: string;
	isDefault?: boolean;
	isActive?: boolean;
	inventory?: number;
	priceInclTax?: number;
	compareAtPrice?: number | null;
}

export function ProductSkuRowActions(props: ProductSkuRowActionsProps) {
	const { sections } = useSkuActions(props);

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger
				render={
					<Button
						variant="ghost"
						size="sm"
						className="size-11 p-0 transition-transform active:scale-95"
						aria-label="Actions pour cette variante"
					/>
				}
			>
				<DotsThreeVerticalIcon className="size-4" />
				<span className="sr-only">Ouvrir le menu d&apos;actions</span>
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent
				title="Actions variante"
				description={props.skuName}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
