"use client"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { useNavigationGuard } from "@/shared/contexts/navigation-guard-context"

/**
 * Modal de confirmation pour les modifications non sauvegardées.
 * Ce composant doit être placé une seule fois dans le layout,
 * à l'intérieur du NavigationGuardProvider.
 */
export function UnsavedChangesDialog() {
	const {
		pendingNavigation,
		guardMessage,
		confirmNavigation,
		cancelNavigation,
	} = useNavigationGuard()

	const isOpen = pendingNavigation !== null

	return (
		<AlertDialog open={isOpen} onOpenChange={(open) => !open && cancelNavigation()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Modifications non enregistrées</AlertDialogTitle>
					<AlertDialogDescription>{guardMessage}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={cancelNavigation}>
						Rester sur la page
					</AlertDialogCancel>
					<AlertDialogAction onClick={confirmNavigation}>
						Quitter sans sauvegarder
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
