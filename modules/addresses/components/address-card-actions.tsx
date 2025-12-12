"use client";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Star, Pencil, Trash2, Loader2, MoreVertical } from "lucide-react";
import { useSetDefaultAddress } from "../hooks/use-set-default-address";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { ADDRESS_DIALOG_ID, DELETE_ADDRESS_DIALOG_ID } from "../constants/dialog.constants";
import type { UserAddress } from "../types/user-addresses.types";

interface AddressCardActionsProps {
	address: UserAddress;
}

export function AddressCardActions({ address }: AddressCardActionsProps) {
	const editDialog = useDialog(ADDRESS_DIALOG_ID);
	const deleteDialog = useAlertDialog(DELETE_ADDRESS_DIALOG_ID);
	const { handle: handleSetDefault, isPending: isSettingDefault } =
		useSetDefaultAddress();

	const isPending = isSettingDefault;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" disabled={isPending}>
					{isPending ? (
						<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
					) : (
						<MoreVertical className="h-4 w-4" aria-hidden="true" />
					)}
					<span className="sr-only">
						Actions pour {address.firstName} {address.lastName}
					</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{!address.isDefault && (
					<DropdownMenuItem
						onClick={() => handleSetDefault(address.id)}
						disabled={isPending}
					>
						<Star className="h-4 w-4 mr-2" aria-hidden="true" />
						Définir par défaut
					</DropdownMenuItem>
				)}
				<DropdownMenuItem
					onClick={() => editDialog.open({ address })}
					disabled={isPending}
				>
					<Pencil className="h-4 w-4 mr-2" aria-hidden="true" />
					Modifier
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() =>
						deleteDialog.open({
							addressId: address.id,
							addressLabel: `${address.firstName} ${address.lastName} - ${address.city}`,
							isDefault: address.isDefault,
						})
					}
					disabled={isPending}
					className="text-destructive"
				>
					<Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
					Supprimer
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
