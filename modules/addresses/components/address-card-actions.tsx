"use client";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Star, Pencil, Trash2, LoaderCircle, EllipsisVertical } from "lucide-react";
import { useSetDefaultAddress } from "../hooks/use-set-default-address";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { ADDRESS_DIALOG_ID, DELETE_ADDRESS_DIALOG_ID } from "../constants/dialog.constants";
import type { UserAddress } from "../types/user-addresses.types";

interface AddressCardActionsProps {
	address: UserAddress;
}

export function AddressCardActions({ address }: AddressCardActionsProps) {
	const editDialog = useDialog(ADDRESS_DIALOG_ID);
	const deleteDialog = useAlertDialog(DELETE_ADDRESS_DIALOG_ID);
	const { handle: handleSetDefault, isPending: isSettingDefault } = useSetDefaultAddress();

	const isPending = isSettingDefault;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" disabled={isPending}>
					{isPending ? (
						<LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
					) : (
						<EllipsisVertical className="size-4" aria-hidden="true" />
					)}
					<span className="sr-only">
						Actions pour {address.firstName} {address.lastName}
					</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{!address.isDefault && (
					<DropdownMenuItem
						onClick={() => {
							triggerHaptic("selection");
							handleSetDefault(address.id);
						}}
						disabled={isPending}
					>
						<Star className="mr-2 size-4" aria-hidden="true" />
						Définir par défaut
					</DropdownMenuItem>
				)}
				<DropdownMenuItem
					onClick={() => {
						triggerHaptic("selection");
						editDialog.open({ address });
					}}
					disabled={isPending}
				>
					<Pencil className="mr-2 size-4" aria-hidden="true" />
					Modifier
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						triggerHaptic("selection");
						deleteDialog.open({
							addressId: address.id,
							addressLabel: `${address.firstName} ${address.lastName} - ${address.city}`,
							isDefault: address.isDefault,
						});
					}}
					disabled={isPending}
					className="text-destructive"
				>
					<Trash2 className="mr-2 size-4" aria-hidden="true" />
					Supprimer
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
