"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MoreVertical, Eye, Send, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { StockNotificationStatus } from "@/app/generated/prisma/browser";
import { useCancelStockNotification } from "../../hooks/use-cancel-stock-notification";
import { useNotifyStockAvailable } from "../../hooks/use-notify-stock-available";
import type { StockNotificationAdmin } from "../../data/get-stock-notifications-admin";

interface StockNotificationsRowActionsProps {
	notification: StockNotificationAdmin;
}

export function StockNotificationsRowActions({
	notification,
}: StockNotificationsRowActionsProps) {
	const [showCancelDialog, setShowCancelDialog] = useState(false);
	const [showNotifyDialog, setShowNotifyDialog] = useState(false);
	const [, startTransition] = useTransition();

	const { action: cancelAction, isPending: isCanceling } =
		useCancelStockNotification();
	const { action: notifyAction, isPending: isNotifying } =
		useNotifyStockAvailable();

	const isLoading = isCanceling || isNotifying;
	const isPendingStatus =
		notification.status === StockNotificationStatus.PENDING;
	const hasStock = notification.sku.inventory > 0;

	function handleCancel() {
		const formData = new FormData();
		formData.append("notificationId", notification.id);
		startTransition(() => {
			cancelAction(formData);
		});
		setShowCancelDialog(false);
	}

	function handleNotify() {
		const formData = new FormData();
		formData.append("skuId", notification.sku.id);
		startTransition(() => {
			notifyAction(formData);
		});
		setShowNotifyDialog(false);
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="h-11 w-11 p-0 active:scale-95 transition-transform" aria-label="Actions">
						<MoreVertical className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{/* Voir le produit */}
					<DropdownMenuItem asChild>
						<Link
							href={`/admin/catalogue/produits/${notification.sku.product.id}`}
						>
							<Eye className="mr-2 h-4 w-4" />
							Voir le produit
						</Link>
					</DropdownMenuItem>

					{/* Envoyer notification (si en stock et en attente) */}
					{isPendingStatus && hasStock && (
						<DropdownMenuItem onClick={() => setShowNotifyDialog(true)}>
							<Send className="mr-2 h-4 w-4" />
							Envoyer notification
						</DropdownMenuItem>
					)}

					{/* Annuler (si en attente) */}
					{isPendingStatus && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => setShowCancelDialog(true)}
								className="text-destructive focus:text-destructive"
							>
								<XCircle className="mr-2 h-4 w-4" />
								Annuler la demande
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Dialog de confirmation d'annulation */}
			<AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Annuler cette demande ?</AlertDialogTitle>
						<AlertDialogDescription>
							L'utilisateur ne recevra pas de notification pour ce produit.
							Cette action est irreversible.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
						<Button
							onClick={handleCancel}
							disabled={isLoading}
						>
							{isLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								"Confirmer"
							)}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Dialog de confirmation d'envoi */}
			<AlertDialog open={showNotifyDialog} onOpenChange={setShowNotifyDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Envoyer les notifications ?</AlertDialogTitle>
						<AlertDialogDescription>
							Un email sera envoye a toutes les personnes en attente pour ce
							produit ({notification.sku.product.title}).
							<br />
							<br />
							Stock actuel : <strong>{notification.sku.inventory}</strong>{" "}
							exemplaire(s)
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
						<Button onClick={handleNotify} disabled={isLoading}>
							{isLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								"Envoyer"
							)}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
