"use client";

import { useState } from "react";
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

export const LOGOUT_DIALOG_ID = "logout";

interface LogoutAlertDialogProps {
	children: React.ReactNode;
}

export function LogoutAlertDialog({ children }: LogoutAlertDialogProps) {
	const [open, setOpen] = useState(false);
	const { action, isPending, isLoggedOut } = useLogout({
		onSuccess: () => setOpen(false),
	});

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
			<AlertDialogContent>
				<form
					action={action}
					data-pending={isPending || isLoggedOut ? "" : undefined}
					aria-busy={isPending || isLoggedOut}
				>
					<AlertDialogHeader>
						<AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
						<AlertDialogDescription>
							Veux-tu vraiment te déconnecter de ton compte ?
							<br />
							<br />
							<span className="text-muted-foreground text-sm">
								Tu pourras te reconnecter à tout moment.
							</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending || isLoggedOut}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction type="submit" disabled={isPending || isLoggedOut}>
							{isLoggedOut
								? "Déconnecté !"
								: isPending
									? "Déconnexion..."
									: "Se déconnecter"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
