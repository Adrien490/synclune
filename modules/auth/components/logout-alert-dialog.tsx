"use client";

import { useState } from "react";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
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
				<form action={action}>
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
						<Button type="submit" disabled={isPending || isLoggedOut}>
							{isLoggedOut
								? "Déconnecté !"
								: isPending
									? "Déconnexion..."
									: "Se déconnecter"}
						</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
