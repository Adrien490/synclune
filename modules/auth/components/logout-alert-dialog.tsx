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
import { LogoutButton } from "./logout-button";

export const LOGOUT_DIALOG_ID = "logout";

/**
 * Dialog de confirmation pour la déconnexion
 *
 * Utilise le store AlertDialog pour gérer l'état
 * et le hook useLogout pour l'action
 */
interface LogoutAlertDialogProps {
	children: React.ReactNode;
}

export function LogoutAlertDialog({ children }: LogoutAlertDialogProps) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
			<AlertDialogContent>
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
					<AlertDialogCancel type="button" className="w-full sm:w-auto">
						Annuler
					</AlertDialogCancel>
					<LogoutButton>
						<Button variant="default" className="w-full sm:w-auto">
							Se déconnecter
						</Button>
					</LogoutButton>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
