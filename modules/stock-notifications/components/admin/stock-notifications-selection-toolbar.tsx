"use client";

import { SelectionToolbar } from "@/shared/components/selection-toolbar";
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
import { useSelectionContext } from "@/shared/contexts/selection-context";
import {
	useBulkCancelStockNotifications,
	useBulkDeleteStockNotifications,
} from "@/modules/stock-notifications/hooks/use-bulk-stock-notification-actions";
import {
	Loader2,
	MoreVertical,
	Trash2,
	XCircle,
} from "lucide-react";
import { useState } from "react";

interface StockNotificationsSelectionToolbarProps {
	notificationIds: string[];
}

export function StockNotificationsSelectionToolbar({}: StockNotificationsSelectionToolbarProps) {
	const { selectedItems, clearSelection } = useSelectionContext();

	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const { action: cancelAction, isPending: isCancelPending } = useBulkCancelStockNotifications({
		onSuccess: () => {
			setCancelDialogOpen(false);
			clearSelection();
		},
	});

	const { action: deleteAction, isPending: isDeletePending } = useBulkDeleteStockNotifications({
		onSuccess: () => {
			setDeleteDialogOpen(false);
			clearSelection();
		},
	});

	const isPending = isCancelPending || isDeletePending;

	if (selectedItems.length === 0) return null;

	return (
		<>
			<SelectionToolbar>
				<span className="text-sm text-muted-foreground">
					{selectedItems.length} notification{selectedItems.length > 1 ? "s" : ""}{" "}
					sélectionnée
					{selectedItems.length > 1 ? "s" : ""}
				</span>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
							<span className="sr-only">Ouvrir le menu</span>
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-50">
						<DropdownMenuItem onClick={() => setCancelDialogOpen(true)}>
							<XCircle className="h-4 w-4" />
							Annuler
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => setDeleteDialogOpen(true)}
							variant="destructive"
						>
							<Trash2 className="h-4 w-4" />
							Supprimer
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SelectionToolbar>

			{/* Cancel Dialog */}
			<AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
				<AlertDialogContent>
					<form action={cancelAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Annuler les notifications</AlertDialogTitle>
							<AlertDialogDescription>
								Annuler{" "}
								<span className="font-semibold">
									{selectedItems.length} notification{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								?
								<br />
								<br />
								Seules les notifications en attente seront annulées.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Fermer
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending} aria-busy={isPending}>
								{isCancelPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Annulation...
									</>
								) : (
									<>
										<XCircle className="mr-2 h-4 w-4" />
										Annuler
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			{/* Delete Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<form action={deleteAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Supprimer définitivement</AlertDialogTitle>
							<AlertDialogDescription>
								Supprimer définitivement{" "}
								<span className="font-semibold">
									{selectedItems.length} notification{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								?
								<br />
								<br />
								<span className="text-destructive font-medium">
									Cette action est irréversible. Toutes les données seront effacées (RGPD).
								</span>
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Fermer
							</AlertDialogCancel>
							<Button
								type="submit"
								disabled={isPending}
								aria-busy={isPending}
							>
								{isDeletePending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Suppression...
									</>
								) : (
									<>
										<Trash2 className="mr-2 h-4 w-4" />
										Supprimer
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
