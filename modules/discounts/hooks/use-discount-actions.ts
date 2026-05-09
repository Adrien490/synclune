"use client";

import { Copy, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useBulkSelectionActionItem } from "@/shared/hooks/use-bulk-selection-action-item";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { toast } from "@/shared/utils/toast";
import { withViewTransition } from "@/shared/utils/with-view-transition";

import type { Discount } from "../types/discount.types";

import { useDuplicateDiscount } from "./use-duplicate-discount";
import { DELETE_DISCOUNT_DIALOG_ID } from "../components/admin/delete-discount-alert-dialog";
import { TOGGLE_DISCOUNT_STATUS_DIALOG_ID } from "../components/admin/toggle-discount-status-alert-dialog";

interface UseDiscountActionsParams {
	discount: Discount;
}

export function useDiscountActions({ discount }: UseDiscountActionsParams): {
	sections: ActionMenuSection[];
} {
	const { open: openDeleteDialog } = useAlertDialog(DELETE_DISCOUNT_DIALOG_ID);
	const { open: openToggleDialog } = useAlertDialog(TOGGLE_DISCOUNT_STATUS_DIALOG_ID);
	const router = useRouter();
	const haptic = useHaptic();
	const selectActionItem = useBulkSelectionActionItem(discount.id);
	const { duplicate, isPending: isDuplicating } = useDuplicateDiscount({
		onSuccess: (message, data) => {
			haptic("success");
			router.refresh();
			toast.success(message, {
				action: {
					label: "Voir le code",
					onClick: () =>
						withViewTransition(() => router.push(`/admin/marketing/discounts/${data.id}/modifier`)),
				},
			});
		},
	});

	const canDelete = discount.usageCount === 0;

	const sections: ActionMenuSection[] = [
		{
			key: "manage",
			items: [
				...(selectActionItem ? [selectActionItem] : []),
				{
					key: "edit",
					label: "Modifier",
					icon: Pencil,
					href: `/admin/marketing/discounts/${discount.id}/modifier`,
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
					closesMenu: false,
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
					closesMenu: false,
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

	return { sections };
}
