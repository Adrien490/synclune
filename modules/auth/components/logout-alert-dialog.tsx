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
						Voulez-vous vraiment vous déconnecter de votre compte ?
						<br />
						<br />
						<span className="text-muted-foreground text-sm">
							Vous pourrez vous reconnecter à tout moment.
						</span>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel type="button">Annuler</AlertDialogCancel>
					<LogoutButton>
						<Button variant="default">Se déconnecter</Button>
					</LogoutButton>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
