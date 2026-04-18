"use client";

import { LoaderCircle } from "lucide-react";

import { useBulkDeleteAnnouncements } from "@/modules/announcements/hooks/use-bulk-delete-announcements";
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
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

export const BULK_DELETE_ANNOUNCEMENTS_DIALOG_ID = "bulk-delete-announcements";

interface BulkDeleteAnnouncementsData {
	announcementIds: string[];
	[key: string]: unknown;
}

export function BulkDeleteAnnouncementsAlertDialog() {
	const dialog = useAlertDialog<BulkDeleteAnnouncementsData>(BULK_DELETE_ANNOUNCEMENTS_DIALOG_ID);
	const { clearSelection } = useSelectionContext();
	const haptic = useHaptic();

	const { action, isPending } = useBulkDeleteAnnouncements({
		onSuccess: () => {
			haptic("success");
			clearSelection();
			dialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	const count = dialog.data?.announcementIds.length ?? 0;

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					{(dialog.data?.announcementIds ?? []).map((id) => (
						<input key={id} type="hidden" name="ids" value={id} />
					))}

					<AlertDialogHeader>
						<AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-3">
								<p>
									Êtes-vous sûr de vouloir supprimer{" "}
									<strong>
										{count} annonce{count > 1 ? "s" : ""}
									</strong>{" "}
									?
								</p>
								<p className="text-destructive font-medium">Cette action est irréversible.</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={isPending}
							aria-busy={isPending}
							onPointerDown={() => haptic("heavy")}
						>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending ? "Suppression..." : "Supprimer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
