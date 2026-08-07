"use client";

import { Spinner } from "@/shared/components/ui/spinner";
import { useState, type ReactElement } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { useLogout } from "../hooks/use-logout";

interface LogoutAlertDialogProps {
	children?: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

/**
 * ⚠️ Reste sur les primitives, à dessein : ce composant expose son PROPRE
 * déclencheur (`children` → `AlertDialogTrigger`, 5 consommateurs), or
 * `ConfirmDialog` est une surface strictement contrôlée sans prop `trigger`.
 * C'est le 4ᵉ invariant de sa frontière.
 */
export function LogoutAlertDialog({
	children,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
}: LogoutAlertDialogProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const open = controlledOpen ?? internalOpen;
	const setOpen = controlledOnOpenChange ?? setInternalOpen;
	const { action, isPending, isLoggedOut } = useLogout({
		onSuccess: () => setOpen(false),
	});

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			{children && <AlertDialogTrigger render={children as ReactElement} />}
			<AlertDialogContent>
				<form
					action={action}
					data-pending={isPending || isLoggedOut ? "" : undefined}
					aria-busy={isPending || isLoggedOut}
				>
					<AlertDialogHeader>
						<AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
						<AlertDialogDescription render={<div className="space-y-3" />}>
							<p>Voulez-vous vraiment vous déconnecter de votre compte ?</p>
							<p className="text-muted-foreground text-sm">
								Vous pourrez vous reconnecter à tout moment.
							</p>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending || isLoggedOut}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							tone="neutral"
							type="submit"
							disabled={isPending || isLoggedOut}
							aria-busy={isPending || isLoggedOut}
						>
							{(isPending || isLoggedOut) && <Spinner presentational />}
							{isLoggedOut ? "Déconnecté !" : isPending ? "Déconnexion…" : "Se déconnecter"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
