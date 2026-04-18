"use client";

import { CircleCheck, CircleX, EllipsisVertical, LoaderCircle } from "lucide-react";
import { useState } from "react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useBulkApproveRefunds } from "@/modules/refunds/hooks/use-bulk-approve-refunds";
import { useBulkRejectRefunds } from "@/modules/refunds/hooks/use-bulk-reject-refunds";

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

	const sections: ActionMenuSection[] = [
		{
			key: "decision",
			items: [
				{
					key: "approve",
					label: "Approuver",
					icon: CircleCheck,
					onSelect: () => setApproveDialogOpen(true),
				},
			],
		},
		{
			key: "danger",
			items: [
				{
					key: "reject",
					label: "Refuser",
					icon: CircleX,
					variant: "destructive",
					onSelect: () => setRejectDialogOpen(true),
				},
			],
		},
	];

	const label = `${selectedItems.length} remboursement${selectedItems.length > 1 ? "s" : ""} sélectionné${selectedItems.length > 1 ? "s" : ""}`;

	return (
		<>
			<ResponsiveActionMenu>
				<ResponsiveActionMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-11 w-11 p-0"
						aria-label="Actions de la sélection"
					>
						<span className="sr-only">Ouvrir le menu</span>
						<EllipsisVertical className="h-4 w-4" />
					</Button>
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent
					title="Actions groupées"
					description={label}
					sections={sections}
				/>
			</ResponsiveActionMenu>

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
							<Button type="submit" disabled={isPending} aria-busy={isPending}>
								{isApprovePending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 motion-safe:animate-spin" />
										Approbation...
									</>
								) : (
									<>
										<CircleCheck className="mr-2 h-4 w-4" />
										Approuver
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

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
							<Button type="submit" disabled={isPending} aria-busy={isPending}>
								{isRejectPending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 motion-safe:animate-spin" />
										Rejet...
									</>
								) : (
									<>
										<CircleX className="mr-2 h-4 w-4" />
										Refuser
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
