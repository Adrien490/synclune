"use client";

import { EllipsisVertical } from "lucide-react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";
import { useHaptic } from "@/shared/hooks/use-haptic";

import { useDiscountActions } from "../../hooks/use-discount-actions";
import type { Discount } from "../../types/discount.types";

interface DiscountRowActionsProps {
	discount: Discount;
}

export function DiscountRowActions({ discount }: DiscountRowActionsProps) {
	const { sections } = useDiscountActions({ discount });
	const haptic = useHaptic();

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger
				render={
					<Button
						variant="ghost"
						size="sm"
						className="size-11 p-0 motion-safe:transition-transform motion-safe:active:scale-95"
						aria-label={`Actions pour ${discount.code}`}
						onPointerDown={() => haptic("selection")}
					/>
				}
			>
				<EllipsisVertical className="size-4" />
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent
				title="Actions"
				description={discount.code}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
