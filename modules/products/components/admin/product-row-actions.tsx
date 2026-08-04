"use client";

import { EllipsisVertical } from "lucide-react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";
import { useHaptic } from "@/shared/hooks/use-haptic";

import { useProductActions } from "../../hooks/use-product-actions";

interface ProductRowActionsProps {
	productId: string;
	productSlug: string;
	productTitle: string;
	productStatus: "DRAFT" | "PUBLIC" | "ARCHIVED";
}

export function ProductRowActions(props: ProductRowActionsProps) {
	const { sections } = useProductActions(props);
	const haptic = useHaptic();

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger
				render={
					<Button
						variant="ghost"
						size="sm"
						className="size-11 p-0 transition-transform active:scale-95"
						aria-label={`Actions pour ${props.productTitle}`}
						onPointerDown={() => haptic("selection")}
					/>
				}
			>
				<EllipsisVertical className="size-4" />
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent
				title="Actions"
				description={props.productTitle}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
