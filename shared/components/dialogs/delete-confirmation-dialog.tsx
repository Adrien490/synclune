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
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import type { ReactNode } from "react";

export interface DeleteConfirmationDialogProps<T extends Record<string, unknown>> {
	/** Unique dialog ID for the alert dialog store */
	dialogId: string;
	/** Dialog title (default: "Confirmer la suppression") */
	title?: string;
	/** Dialog description - can be a string or JSX */
	description: ReactNode | ((data: T | null | undefined) => ReactNode);
	/** Form action from useActionState */
	action: (formData: FormData) => void;
	/** Whether the action is pending */
	isPending: boolean;
	/** Hidden form fields to submit. Keys are field names, values come from dialog data */
	hiddenFields: {
		name: string;
		dataKey: keyof T;
	}[];
	/** Submit button text (default: "Supprimer") */
	submitLabel?: string;
	/** Pending button text (default: "Suppression...") */
	pendingLabel?: string;
}

/**
 * Generic delete confirmation dialog.
 *
 * Provides the common structure for single-item delete confirmations:
 * - AlertDialog with form
 * - Hidden fields populated from dialog data
 * - Cancel and submit buttons with loading state
 *
 * @example
 * ```tsx
 * const { action, isPending } = useDeleteColor({
 *   onSuccess: () => deleteDialog.close(),
 * });
 *
 * <DeleteConfirmationDialog
 *   dialogId={DELETE_COLOR_DIALOG_ID}
 *   action={action}
 *   isPending={isPending}
 *   hiddenFields={[{ name: "id", dataKey: "colorId" }]}
 *   description={(data) => (
 *     <>
 *       Es-tu sûr(e) de vouloir supprimer la couleur{" "}
 *       <strong>"{data?.colorName}"</strong> ?
 *     </>
 *   )}
 * />
 * ```
 */
export function DeleteConfirmationDialog<T extends Record<string, unknown>>({
	dialogId,
	title = "Confirmer la suppression",
	description,
	action,
	isPending,
	hiddenFields,
	submitLabel = "Supprimer",
	pendingLabel = "Suppression...",
}: DeleteConfirmationDialogProps<T>) {
	const dialog = useAlertDialog<T>(dialogId);

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	const renderedDescription =
		typeof description === "function" ? description(dialog.data) : description;

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					{hiddenFields.map(({ name, dataKey }) => (
						<input
							key={name}
							type="hidden"
							name={name}
							value={String(dialog.data?.[dataKey] ?? "")}
						/>
					))}

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
