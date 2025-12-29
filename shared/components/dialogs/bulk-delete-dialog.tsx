"use client";

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
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import type { ReactNode } from "react";

interface BulkDeleteData {
	ids: string[];
	[key: string]: unknown;
}

export interface BulkDeleteDialogProps {
	/** Unique dialog ID for the alert dialog store */
	dialogId: string;
	/** Dialog title (default: "Confirmer la suppression") */
	title?: string;
	/**
	 * Dialog description - can be a string or JSX.
	 * Receives the count of items to delete.
	 */
	description: ReactNode | ((count: number) => ReactNode);
	/** Form action from useActionState */
	action: (formData: FormData) => void;
	/** Whether the action is pending */
	isPending: boolean;
	/** Name of the hidden field for IDs (default: "ids") */
	idsFieldName?: string;
	/** Key in dialog data containing the IDs array (default: "ids") */
	idsDataKey?: string;
	/** Submit button text (default: "Supprimer") */
	submitLabel?: string;
	/** Pending button text (default: "Suppression...") */
	pendingLabel?: string;
}

/**
 * Generic bulk delete confirmation dialog.
 *
 * Provides the common structure for bulk delete confirmations:
 * - AlertDialog with form
 * - Hidden field with JSON array of IDs
 * - Clears selection on success
 * - Cancel and submit buttons with loading state
 *
 * @example
 * ```tsx
 * const { action, isPending } = useBulkDeleteProducts({
 *   onSuccess: () => {
 *     clearSelection();
 *     dialog.close();
 *   },
 * });
 *
 * <BulkDeleteDialog
 *   dialogId={BULK_DELETE_PRODUCTS_DIALOG_ID}
 *   action={action}
 *   isPending={isPending}
 *   idsFieldName="productIds"
 *   idsDataKey="productIds"
 *   description={(count) => (
 *     <>
 *       Es-tu sûr de vouloir supprimer{" "}
 *       <strong>{count} produit{count > 1 ? "s" : ""}</strong> ?
 *     </>
 *   )}
 * />
 * ```
 */
export function BulkDeleteDialog({
	dialogId,
	title = "Confirmer la suppression",
	description,
	action,
	isPending,
	idsFieldName = "ids",
	idsDataKey = "ids",
	submitLabel = "Supprimer",
	pendingLabel = "Suppression...",
}: BulkDeleteDialogProps) {
	const dialog = useAlertDialog<BulkDeleteData>(dialogId);
	const { clearSelection } = useSelectionContext();

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	const ids = (dialog.data?.[idsDataKey] as string[] | undefined) ?? [];
	const count = ids.length;

	const renderedDescription =
		typeof description === "function" ? description(count) : description;

	const handleAction = (formData: FormData) => {
		action(formData);
	};

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={handleAction}>
					<input
						type="hidden"
						name={idsFieldName}
						value={JSON.stringify(ids)}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>{title}</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div>{renderedDescription}</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction type="submit" disabled={isPending}>
							{isPending ? pendingLabel : submitLabel}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
