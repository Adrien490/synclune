"use client";

import { Copy, EllipsisVertical, Pencil, Power, PowerOff, Trash2 } from "lucide-react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useDuplicateDiscount } from "@/modules/discounts/hooks/use-duplicate-discount";
import type { Discount } from "@/modules/discounts/types/discount.types";

import { DELETE_DISCOUNT_DIALOG_ID } from "./delete-discount-alert-dialog";
import { DISCOUNT_DIALOG_ID } from "./discount-form-dialog";
import { TOGGLE_DISCOUNT_STATUS_DIALOG_ID } from "./toggle-discount-status-alert-dialog";

interface DiscountRowActionsProps {
	discount: Discount;
}

export function DiscountRowActions({ discount }: DiscountRowActionsProps) {
	const { open: openEditDialog } = useDialog(DISCOUNT_DIALOG_ID);
	const { open: openDeleteDialog } = useAlertDialog(DELETE_DISCOUNT_DIALOG_ID);
	const { open: openToggleDialog } = useAlertDialog(TOGGLE_DISCOUNT_STATUS_DIALOG_ID);
	const { duplicate, isPending: isDuplicating } = useDuplicateDiscount();
	const haptic = useHaptic();

	const canDelete = discount.usageCount === 0;

	const sections: ActionMenuSection[] = [
		{
			key: "manage",
			items: [
				{
					key: "edit",
					label: "Modifier",
					icon: Pencil,
					onSelect: () =>
						openEditDialog({
							discount: {
								id: discount.id,
								code: discount.code,
								type: discount.type,
								value: discount.value,
								minOrderAmount: discount.minOrderAmount,
								maxUsageCount: discount.maxUsageCount,
								maxUsagePerUser: discount.maxUsagePerUser,
								isActive: discount.isActive,
								startsAt: discount.startsAt,
								endsAt: discount.endsAt,
							},
						}),
				},
				{
					key: "duplicate",
					label: "Dupliquer",
					icon: Copy,
					disabled: isDuplicating,
					onSelect: () => duplicate(discount.id),
				},
				{
					key: "toggle",
					label: discount.isActive ? "Désactiver" : "Activer",
					icon: discount.isActive ? PowerOff : Power,
					onSelect: () =>
						openToggleDialog({
							discountId: discount.id,
							discountCode: discount.code,
							isActive: discount.isActive,
						}),
				},
			],
		},
		{
			key: "danger",
			items: [
				{
					key: "delete",
					label: "Supprimer",
					description: canDelete ? undefined : "Ce code a déjà été utilisé",
					icon: Trash2,
					variant: "destructive",
					disabled: !canDelete,
					onSelect: () =>
						openDeleteDialog({
							discountId: discount.id,
							discountCode: discount.code,
							usageCount: discount.usageCount,
						}),
				},
			],
		},
	];

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-11 w-11 p-0 motion-safe:transition-transform motion-safe:active:scale-95"
					aria-label={`Actions pour ${discount.code}`}
					onPointerDown={() => haptic("selection")}
				>
					<EllipsisVertical className="h-4 w-4" />
				</Button>
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent
				title="Actions"
				description={discount.code}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
