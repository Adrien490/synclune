"use client";

import { Loader2 } from "lucide-react";

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
import { buttonVariants } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

export const TOGGLE_STORE_CLOSURE_DIALOG_ID = "toggle-store-closure";

interface ToggleStoreClosureData {
	isClosed: boolean;
	closureMessage: string;
	reopensAt: string;
	[key: string]: unknown;
}

interface ToggleStoreClosureAlertDialogProps {
	action: (payload: FormData) => void;
	isPending: boolean;
}

export function ToggleStoreClosureAlertDialog({
	action,
	isPending,
}: ToggleStoreClosureAlertDialogProps) {
	const dialog = useAlertDialog<ToggleStoreClosureData>(TOGGLE_STORE_CLOSURE_DIALOG_ID);

	const isClosing = dialog.data?.isClosed ?? false;

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input type="hidden" name="isClosed" value={String(dialog.data?.isClosed ?? false)} />
					<input type="hidden" name="closureMessage" value={dialog.data?.closureMessage ?? ""} />
					<input type="hidden" name="reopensAt" value={dialog.data?.reopensAt ?? ""} />

					<AlertDialogHeader>
						<AlertDialogTitle>
							{isClosing ? "Confirmer la fermeture" : "Confirmer la réouverture"}
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div>
								{isClosing ? (
									<>
										<p>
											Êtes-vous sûr de vouloir <strong>fermer la boutique</strong> ?
										</p>
										<p className="text-muted-foreground mt-2 text-sm">
											Les clients ne pourront plus passer de commandes tant que la boutique sera
											fermée.
										</p>
									</>
								) : (
									<p>
										Êtes-vous sûr de vouloir <strong>réouvrir la boutique</strong> ? Les clients
										pourront à nouveau passer des commandes.
									</p>
								)}
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={isPending}
							aria-busy={isPending}
							className={isClosing ? buttonVariants({ variant: "destructive" }) : undefined}
						>
							{isPending && <Loader2 className="mr-2 animate-spin" />}
							{isPending
								? "Enregistrement..."
								: isClosing
									? "Fermer la boutique"
									: "Réouvrir la boutique"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
