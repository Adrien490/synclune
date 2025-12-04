"use client";

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
import { useBulkApproveRefunds } from "@/modules/refunds/hooks/use-bulk-approve-refunds";
import { useBulkRejectRefunds } from "@/modules/refunds/hooks/use-bulk-reject-refunds";
import {
	CheckCircle2,
	Loader2,
	MoreVertical,
	XCircle,
} from "lucide-react";
import { useState } from "react";

export function RefundSelectionActions() {
	const { selectedItems, clearSelection } = useSelectionContext();

	const [approveDialogOpen, setApproveDialogOpen] = useState(false);
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

	const { action: approveAction, isPending: isApprovePending } = useBulkApproveRefunds({
		onSuccess: () => {
			setApproveDialogOpen(false);
			clearSelection();
		},
	});

	const { action: rejectAction, isPending: isRejectPending } = useBulkRejectRefunds({
		onSuccess: () => {
			setRejectDialogOpen(false);
			clearSelection();
		},
	});

	const isPending = isApprovePending || isRejectPending;

	if (selectedItems.length === 0) return null;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
						<span className="sr-only">Ouvrir le menu</span>
						<MoreVertical className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-[200px]">
					<DropdownMenuItem onClick={() => setApproveDialogOpen(true)}>
						<CheckCircle2 className="h-4 w-4" />
						Approuver
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={() => setRejectDialogOpen(true)}
						variant="destructive"
					>
						<XCircle className="h-4 w-4" />
						Refuser
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Approve Dialog */}
			<AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
				<AlertDialogContent>
					<form action={approveAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Approuver les remboursements</AlertDialogTitle>
							<AlertDialogDescription>
								Approuver{" "}
								<span className="font-semibold">
									{selectedItems.length} remboursement{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								?
								<br />
								<br />
								Seuls les remboursements en attente seront approuvés.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<AlertDialogAction type="submit" disabled={isPending}>
								{isApprovePending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Approbation...
									</>
								) : (
									<>
										<CheckCircle2 className="mr-2 h-4 w-4" />
										Approuver
									</>
								)}
							</AlertDialogAction>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			{/* Reject Dialog */}
			<AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
				<AlertDialogContent>
					<form action={rejectAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Refuser les remboursements</AlertDialogTitle>
							<AlertDialogDescription>
								Refuser{" "}
								<span className="font-semibold">
									{selectedItems.length} remboursement{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								?
								<br />
								<br />
								Seuls les remboursements en attente seront refusés.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Retour
							</AlertDialogCancel>
							<AlertDialogAction
								type="submit"
								disabled={isPending}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								{isRejectPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Rejet...
									</>
								) : (
									<>
										<XCircle className="mr-2 h-4 w-4" />
										Refuser
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
