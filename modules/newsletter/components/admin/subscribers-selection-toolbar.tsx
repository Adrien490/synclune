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
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import {
	useBulkUnsubscribeSubscribers,
	useBulkResubscribeSubscribers,
	useBulkDeleteSubscribers,
} from "@/modules/newsletter/hooks/use-bulk-subscriber-actions";
import {
	CheckCircle2,
	Loader2,
	MailX,
	MoreVertical,
	Trash2,
	UserCheck,
} from "lucide-react";
import { useState } from "react";

interface SubscribersSelectionToolbarProps {
	subscriberIds: string[];
}

export function SubscribersSelectionToolbar({}: SubscribersSelectionToolbarProps) {
	const { selectedItems, clearSelection } = useSelectionContext();

	const [unsubscribeDialogOpen, setUnsubscribeDialogOpen] = useState(false);
	const [resubscribeDialogOpen, setResubscribeDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const { action: unsubscribeAction, isPending: isUnsubscribePending } = useBulkUnsubscribeSubscribers({
		onSuccess: () => {
			setUnsubscribeDialogOpen(false);
			clearSelection();
		},
	});

	const { action: resubscribeAction, isPending: isResubscribePending } = useBulkResubscribeSubscribers({
		onSuccess: () => {
			setResubscribeDialogOpen(false);
			clearSelection();
		},
	});

	const { action: deleteAction, isPending: isDeletePending } = useBulkDeleteSubscribers({
		onSuccess: () => {
			setDeleteDialogOpen(false);
			clearSelection();
		},
	});

	const isPending = isUnsubscribePending || isResubscribePending || isDeletePending;

	if (selectedItems.length === 0) return null;

	return (
		<>
			<SelectionToolbar>
				<span className="text-sm text-muted-foreground">
					{selectedItems.length} abonné{selectedItems.length > 1 ? "s" : ""}{" "}
					sélectionné
					{selectedItems.length > 1 ? "s" : ""}
				</span>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
							<span className="sr-only">Ouvrir le menu</span>
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-[200px]">
						<DropdownMenuItem onClick={() => setResubscribeDialogOpen(true)}>
							<UserCheck className="h-4 w-4" />
							Réabonner
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setUnsubscribeDialogOpen(true)}>
							<MailX className="h-4 w-4" />
							Désabonner
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

			{/* Unsubscribe Dialog */}
			<AlertDialog open={unsubscribeDialogOpen} onOpenChange={setUnsubscribeDialogOpen}>
				<AlertDialogContent>
					<form action={unsubscribeAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Désabonner les abonnés</AlertDialogTitle>
							<AlertDialogDescription>
								Désabonner{" "}
								<span className="font-semibold">
									{selectedItems.length} abonné{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								?
								<br />
								<br />
								Seuls les abonnés actifs seront désabonnés.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<AlertDialogAction type="submit" disabled={isPending}>
								{isUnsubscribePending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Désabonnement...
									</>
								) : (
									<>
										<MailX className="mr-2 h-4 w-4" />
										Désabonner
									</>
								)}
							</AlertDialogAction>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			{/* Resubscribe Dialog */}
			<AlertDialog open={resubscribeDialogOpen} onOpenChange={setResubscribeDialogOpen}>
				<AlertDialogContent>
					<form action={resubscribeAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Réabonner les abonnés</AlertDialogTitle>
							<AlertDialogDescription>
								Réabonner{" "}
								<span className="font-semibold">
									{selectedItems.length} abonné{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								?
								<br />
								<br />
								Seuls les abonnés inactifs avec email vérifié seront réabonnés.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<AlertDialogAction type="submit" disabled={isPending}>
								{isResubscribePending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Réabonnement...
									</>
								) : (
									<>
										<UserCheck className="mr-2 h-4 w-4" />
										Réabonner
									</>
								)}
							</AlertDialogAction>
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
									{selectedItems.length} abonné{selectedItems.length > 1 ? "s" : ""}
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
								Annuler
							</AlertDialogCancel>
							<AlertDialogAction
								type="submit"
								disabled={isPending}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
							</AlertDialogAction>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
