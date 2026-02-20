"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDeleteAddress } from "../hooks/use-delete-address";
import { Loader2 } from "lucide-react";

import { DELETE_ADDRESS_DIALOG_ID } from "../constants/dialog.constants";

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
							Vous voulez vraiment supprimer l'adresse{" "}
							<strong>&quot;{deleteDialog.data?.addressLabel}&quot;</strong> ?
							<br />
							<br />
							{deleteDialog.data?.isDefault && (
								<>
									<span className="text-orange-600 dark:text-orange-400 font-medium">
										C'est votre adresse par défaut. Si vous en avez
										d'autres, une nouvelle sera automatiquement
										sélectionnée par défaut.
									</span>
									<br />
									<br />
								</>
							)}
							<span className="text-muted-foreground text-sm">
								Vous ne pourrez pas annuler cette action.
							</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={isPending}
						>
							{isPending ? "Suppression..." : "Supprimer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
