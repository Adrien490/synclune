"use client";

import { Loader2 } from "lucide-react";
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
						<AlertDialogDescription asChild>
							<div className="space-y-3">
								<p>Voulez-vous vraiment vous déconnecter de votre compte ?</p>
								<p className="text-muted-foreground text-sm">
									Vous pourrez vous reconnecter à tout moment.
								</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending || isLoggedOut}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={isPending || isLoggedOut}
							aria-busy={isPending || isLoggedOut}
						>
							{(isPending || isLoggedOut) && <Loader2 className="animate-spin" />}
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
