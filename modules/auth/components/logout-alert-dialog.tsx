"use client";

import { Spinner } from "@/shared/components/ui/spinner";
import { useState } from "react";
import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
	ResponsiveAlertDialogTrigger,
} from "@/shared/components/ui/responsive-alert-dialog";
import { useLogout } from "../hooks/use-logout";

interface LogoutAlertDialogProps {
	children?: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

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
		<ResponsiveAlertDialog open={open} onOpenChange={setOpen}>
			{children && <ResponsiveAlertDialogTrigger asChild>{children}</ResponsiveAlertDialogTrigger>}
			<ResponsiveAlertDialogContent>
				<form
					action={action}
					data-pending={isPending || isLoggedOut ? "" : undefined}
					aria-busy={isPending || isLoggedOut}
				>
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Se déconnecter ?</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div className="space-y-3">
								<p>Voulez-vous vraiment vous déconnecter de votre compte ?</p>
								<p className="text-muted-foreground text-sm">
									Vous pourrez vous reconnecter à tout moment.
								</p>
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel type="button" disabled={isPending || isLoggedOut}>
							Annuler
						</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction
							type="submit"
							disabled={isPending || isLoggedOut}
							aria-busy={isPending || isLoggedOut}
						>
							{(isPending || isLoggedOut) && <Spinner presentational />}
							{isLoggedOut ? "Déconnecté !" : isPending ? "Déconnexion…" : "Se déconnecter"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
