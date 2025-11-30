"use client";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { Copy, Eye, MoreVertical, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { DISCOUNT_DIALOG_ID } from "./discount-form-dialog";
import { DELETE_DISCOUNT_DIALOG_ID } from "./delete-discount-alert-dialog";
import { TOGGLE_DISCOUNT_STATUS_DIALOG_ID } from "./toggle-discount-status-alert-dialog";
import { useDuplicateDiscount } from "@/modules/discounts/hooks/use-duplicate-discount";
import { DISCOUNT_USAGES_DIALOG_ID } from "./discount-usages-dialog";
import type { Discount } from "@/modules/discounts/types/discount.types";

interface DiscountRowActionsProps {
	discount: Discount;
}

export function DiscountRowActions({ discount }: DiscountRowActionsProps) {
	const { open: openEditDialog } = useDialog(DISCOUNT_DIALOG_ID);
	const { open: openDeleteDialog } = useAlertDialog(DELETE_DISCOUNT_DIALOG_ID);
	const { open: openToggleDialog } = useAlertDialog(TOGGLE_DISCOUNT_STATUS_DIALOG_ID);
	const { open: openUsagesDialog } = useDialog(DISCOUNT_USAGES_DIALOG_ID);
	const { duplicate, isPending: isDuplicating } = useDuplicateDiscount();

	const canDelete = discount.usageCount === 0;

	const handleViewUsages = () => {
		openUsagesDialog({
			discountId: discount.id,
			discountCode: discount.code,
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					onClick={() => {
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
							},
						});
					}}
				>
					<Pencil className="h-4 w-4" />
					Modifier
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => duplicate(discount.id, discount.code)}
					disabled={isDuplicating}
				>
					<Copy className="h-4 w-4" />
					Dupliquer
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handleViewUsages}>
					<Eye className="h-4 w-4" />
					Voir les utilisations
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						openToggleDialog({
							discountId: discount.id,
							discountCode: discount.code,
							isActive: discount.isActive,
						});
					}}
				>
					{discount.isActive ? (
						<>
							<PowerOff className="h-4 w-4" />
							Désactiver
						</>
					) : (
						<>
							<Power className="h-4 w-4" />
							Activer
						</>
					)}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => {
						openDeleteDialog({
							discountId: discount.id,
							discountCode: discount.code,
							usageCount: discount.usageCount,
						});
					}}
					className="text-destructive"
					disabled={!canDelete}
				>
					<Trash2 className="h-4 w-4" />
					Supprimer
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
