"use client";

import { EllipsisVertical, LoaderCircle, MailX, Trash2 } from "lucide-react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { SelectionToolbar } from "@/shared/components/selection-toolbar";
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
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { useAdminBulkDeleteNewsletterSubscribers } from "../../hooks/use-admin-bulk-delete-newsletter-subscribers";
import { useAdminBulkUnsubscribeNewsletter } from "../../hooks/use-admin-bulk-unsubscribe-newsletter";

interface NewsletterSelectionToolbarProps {
	pageItemIds?: string[];
}

export function NewsletterSelectionToolbar({ pageItemIds }: NewsletterSelectionToolbarProps = {}) {
	const { selectedItems, clearSelection } = useSelectionContext();
	const deleteDialog = useDialog("bulk-newsletter-delete");
	const unsubscribeDialog = useDialog("bulk-newsletter-unsubscribe");

	const { action: deleteAction, isPending: isDeletePending } =
		useAdminBulkDeleteNewsletterSubscribers({
			onSuccess: () => {
				deleteDialog.close();
				clearSelection();
			},
		});

	const { action: unsubscribeAction, isPending: isUnsubscribePending } =
		useAdminBulkUnsubscribeNewsletter({
			onSuccess: () => {
				unsubscribeDialog.close();
				clearSelection();
			},
		});

	const isPending = isDeletePending || isUnsubscribePending;

	if (selectedItems.length === 0) return null;

	const handleBulkDelete = (formData: FormData) => {
		selectedItems.forEach((id) => formData.append("subscriberIds", id));
		deleteAction(formData);
	};

	const handleBulkUnsubscribe = (formData: FormData) => {
		selectedItems.forEach((id) => formData.append("subscriberIds", id));
		unsubscribeAction(formData);
	};

	const sections: ActionMenuSection[] = [
		{
			key: "manage",
			items: [
				{
					key: "unsubscribe",
					label: "Désabonner",
					icon: MailX,
					onSelect: () => unsubscribeDialog.open(),
				},
			],
		},
		{
			key: "danger",
			items: [
				{
					key: "delete",
					label: "Supprimer (RGPD)",
					description: "Anonymisation pour conformité légale",
					icon: Trash2,
					variant: "destructive",
					onSelect: () => deleteDialog.open(),
				},
			],
		},
	];

	const label = `${selectedItems.length} abonné${selectedItems.length > 1 ? "s" : ""} sélectionné${selectedItems.length > 1 ? "s" : ""}`;

	return (
		<>
			<SelectionToolbar pageItemIds={pageItemIds}>
				<span className="text-muted-foreground text-sm">{label}</span>
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
			</SelectionToolbar>

			<AlertDialog
				open={deleteDialog.isOpen}
				onOpenChange={(open) => (open ? deleteDialog.open() : deleteDialog.close())}
			>
				<AlertDialogContent>
					<form action={handleBulkDelete}>
						<AlertDialogHeader>
							<AlertDialogTitle>Supprimer les abonnés</AlertDialogTitle>
							<AlertDialogDescription>
								Supprimer définitivement{" "}
								<span className="font-semibold">
									{selectedItems.length} abonné{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								de la liste newsletter (conformité RGPD) ?
								<br />
								<br />
								Les enregistrements seront conservés de manière anonymisée pour la conformité
								légale.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isDeletePending}>
								Annuler
							</AlertDialogCancel>
							<Button
								type="submit"
								variant="destructive"
								disabled={isDeletePending}
								aria-busy={isDeletePending}
							>
								{isDeletePending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 motion-safe:animate-spin" />
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

			<AlertDialog
				open={unsubscribeDialog.isOpen}
				onOpenChange={(open) => (open ? unsubscribeDialog.open() : unsubscribeDialog.close())}
			>
				<AlertDialogContent>
					<form action={handleBulkUnsubscribe}>
						<AlertDialogHeader>
							<AlertDialogTitle>Désabonner les abonnés</AlertDialogTitle>
							<AlertDialogDescription>
								Désabonner{" "}
								<span className="font-semibold">
									{selectedItems.length} abonné{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								de la newsletter ?
								<br />
								<br />
								Les abonnés déjà désabonnés seront ignorés.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending} aria-busy={isUnsubscribePending}>
								{isUnsubscribePending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 motion-safe:animate-spin" />
										Désabonnement...
									</>
								) : (
									<>
										<MailX className="mr-2 h-4 w-4" />
										Désabonner
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
