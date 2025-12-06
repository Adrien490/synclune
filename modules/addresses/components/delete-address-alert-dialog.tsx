"use client";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { Loader2 } from "lucide-react";
import { useDeleteAddress } from "../hooks/use-delete-address";

export const DELETE_ADDRESS_DIALOG_ID = "delete-address";

interface DeleteAddressData {
	addressId: string;
	addressLabel: string;
	isDefault?: boolean;
	[key: string]: unknown;
}

export function DeleteAddressAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteAddressData>(
		DELETE_ADDRESS_DIALOG_ID
	);

	const { action, isPending } = useDeleteAddress({
		onSuccess: () => {
			deleteDialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			deleteDialog.close();
		}
	};

	return (
		<AlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input
						type="hidden"
						name="addressId"
						value={deleteDialog.data?.addressId ?? ""}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer cette adresse ?</AlertDialogTitle>
						<AlertDialogDescription>
							Tu veux vraiment supprimer l'adresse{" "}
							<strong>&quot;{deleteDialog.data?.addressLabel}&quot;</strong> ?
							<br />
							<br />
							{deleteDialog.data?.isDefault && (
								<>
									<span className="text-orange-600 dark:text-orange-400 font-medium">
										C'est ton adresse par défaut. Si tu en as
										d'autres, une nouvelle sera automatiquement
										sélectionnée par défaut.
									</span>
									<br />
									<br />
								</>
							)}
							<span className="text-muted-foreground text-sm">
								Tu ne pourras pas annuler cette action.
							</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<Button
							type="submit"
							variant="destructive"
							disabled={isPending}
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Suppression...
								</>
							) : (
								"Supprimer"
							)}
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
