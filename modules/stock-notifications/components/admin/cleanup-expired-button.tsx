"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
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
import { useCleanupExpiredNotifications } from "../../hooks/use-cleanup-expired-notifications";
import { STOCK_NOTIFICATION_EXPIRY_DAYS } from "../../constants/stock-notification.constants";

export function CleanupExpiredButton() {
	const { action, isPending } = useCleanupExpiredNotifications();

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="outline" size="sm" disabled={isPending}>
					<Trash2 className="h-4 w-4 mr-2" />
					{isPending ? "Nettoyage..." : "Nettoyer les expirées"}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Nettoyer les demandes expirées</AlertDialogTitle>
					<AlertDialogDescription>
						Cette action marquera comme expirées toutes les demandes en attente
						depuis plus de {STOCK_NOTIFICATION_EXPIRY_DAYS} jours. Les
						utilisateurs concernés ne seront plus notifiés pour ces produits.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Annuler</AlertDialogCancel>
					<form action={action}>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Nettoyage..." : "Confirmer"}
						</Button>
					</form>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
