"use client";

import { EllipsisVertical } from "lucide-react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";

import { useProductActions } from "../../hooks/use-product-actions";

interface ProductRowActionsProps {
	productId: string;
	productSlug: string;
	productTitle: string;
	productStatus: "DRAFT" | "PUBLIC" | "ARCHIVED";
}

export function ProductRowActions(props: ProductRowActionsProps) {
	const { sections } = useProductActions(props);

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-11 w-11 p-0 transition-transform active:scale-95"
					aria-label={`Actions pour ${props.productTitle}`}
				>
					<EllipsisVertical className="h-4 w-4" />
				</Button>
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent
				title="Actions"
				description={props.productTitle}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
