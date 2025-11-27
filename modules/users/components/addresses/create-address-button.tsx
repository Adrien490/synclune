"use client";

import { Button } from "@/shared/components/ui/button";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { ADDRESS_DIALOG_ID } from "@/modules/users/components/address/address-form-dialog";
import { Plus } from "lucide-react";
import type { ComponentProps } from "react";

type CreateAddressButtonProps = Omit<ComponentProps<typeof Button>, "onClick">;

export function CreateAddressButton({ children, ...props }: CreateAddressButtonProps) {
	const dialog = useDialog(ADDRESS_DIALOG_ID);

	return (
		<Button onClick={() => dialog.open()} {...props}>
			{children || (
				<>
					<Plus className="mr-2 h-4 w-4" />
					Ajouter une adresse
				</>
			)}
		</Button>
	);
}
