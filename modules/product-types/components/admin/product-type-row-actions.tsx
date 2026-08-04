"use client";

import { DotsThreeVerticalIcon } from "@phosphor-icons/react/ssr";

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
			<ResponsiveActionMenuTrigger
				render={
					<Button
						variant="ghost"
						size="sm"
						className="size-11 p-0 motion-safe:transition-transform motion-safe:active:scale-95"
						aria-label="Actions"
					/>
				}
			>
				<DotsThreeVerticalIcon className="size-4" />
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent title="Actions" description={props.label} sections={sections} />
		</ResponsiveActionMenu>
	);
}
