"use client";

import { Loader2 } from "lucide-react";

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
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

import { DELETE_ANNOUNCEMENT_DIALOG_ID } from "../../constants/dialog";
import { useDeleteAnnouncement } from "../../hooks/use-delete-announcement";
import type { DeleteAnnouncementData } from "../../types/announcement.types";

export function DeleteAnnouncementAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteAnnouncementData>(DELETE_ANNOUNCEMENT_DIALOG_ID);
	const { action, isPending } = useDeleteAnnouncement({
		onSuccess: () => {
			deleteDialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			deleteDialog.close();
		}
	};

	return (
		<AlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={deleteDialog.data?.announcementId ?? ""} />

					<AlertDialogHeader>
						<AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-3">
								<p>
									Êtes-vous sûr de vouloir supprimer l&apos;annonce{" "}
									<strong>&quot;{deleteDialog.data?.announcementMessage}&quot;</strong> ?
								</p>
								<p className="text-destructive font-medium">Cette action est irréversible.</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <Loader2 className="animate-spin" />}
							{isPending ? "Suppression..." : "Supprimer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
