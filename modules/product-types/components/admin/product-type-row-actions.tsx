"use client";

import { EllipsisVertical } from "lucide-react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";

import { useProductTypeActions } from "../../hooks/use-product-type-actions";

interface ProductTypeRowActionsProps {
	productTypeId: string;
	isSystem?: boolean;
	label: string;
	description?: string | null;
	slug: string;
	productsCount?: number;
}

export function ProductTypeRowActions(props: ProductTypeRowActionsProps) {
	const { sections } = useProductTypeActions(props);

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-11 w-11 p-0 motion-safe:transition-transform motion-safe:active:scale-95"
					aria-label="Actions"
				>
					<EllipsisVertical className="h-4 w-4" />
				</Button>
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent title="Actions" description={props.label} sections={sections} />
		</ResponsiveActionMenu>
	);
}
