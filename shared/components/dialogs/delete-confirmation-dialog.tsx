"use client";

import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogHeroIcon,
	ResponsiveAlertDialogTitle,
	type ResponsiveAlertTone,
} from "@/shared/components/ui/responsive-alert-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { LoaderCircle, Trash2 } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

interface DeleteConfirmationDialogProps<T extends Record<string, unknown>> {
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
	/** Tonalité visuelle (default: "destructive" — pilote couleur hero icon + bouton + haptic) */
	tone?: ResponsiveAlertTone;
	/** Hero icon affiché en haut sur mobile (default: Trash2) */
	icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}

/**
 * Generic delete confirmation dialog.
 *
 * Hero icon centré (mobile) dans cercle tinted selon la tonalité, titre bold court,
 * description text-balance, boutons full-width empilés (action h-12 rounded-xl en haut,
 * cancel ghost en dessous). Le swipe-down + tap-overlay sont automatiquement bloqués
 * quand `tone="destructive"` (défaut) — fermeture obligatoire via "Annuler".
 *
 * @example
 * ```tsx
 * <DeleteConfirmationDialog
 *   dialogId={DELETE_COLOR_DIALOG_ID}
 *   action={action}
 *   isPending={isPending}
 *   hiddenFields={[{ name: "id", dataKey: "colorId" }]}
 *   description={(data) => (
 *     <>
 *       Êtes-vous sûr(e) de vouloir supprimer la couleur{" "}
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
	pendingLabel = "Suppression…",
	tone = "destructive",
	icon = Trash2,
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
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange} tone={tone}>
			<ResponsiveAlertDialogContent>
				<form action={action}>
					{hiddenFields.map(({ name, dataKey }) => (
						<input
							key={name}
							type="hidden"
							name={name}
							value={String(dialog.data?.[dataKey] ?? "")}
						/>
					))}

					<ResponsiveAlertDialogHeroIcon icon={icon} />
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>{title}</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div>{renderedDescription}</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <LoaderCircle className="motion-safe:animate-spin" />}
							{isPending ? pendingLabel : submitLabel}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
