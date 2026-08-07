"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useBackToListOnDelete } from "@/shared/hooks/use-back-to-list-on-delete";

import { formatUsage } from "../config/taxonomy.config";
import type { TaxonomyConfig } from "../types/taxonomy.types";

/**
 * Charge utile normalisée du dialog de suppression.
 *
 * Les trois modules passaient des clés différentes (`colorId`/`colorName`,
 * `materialId`/`materialName`, `productTypeId`/`label`) ; une seule forme
 * suffit. `usageCount` n'était renseigné que par les types de bijoux, mais le
 * blocage vaut pour les trois (la contrainte FK est en ON DELETE RESTRICT
 * partout) — l'avertissement s'affiche donc dès qu'il est fourni.
 *
 * Volontairement un alias `type` SANS index signature : chaque ouvreur doit
 * typer son `useAlertDialog<TaxonomyDeletePayload>` pour que `tsc` rougisse
 * sur une clé manquante ou renommée. Une interface à index signature avait
 * laissé les trois ouvreurs publier leurs clés historiques (`colorId`…) sans
 * erreur — le champ caché postait `id=""` et aucune suppression de référentiel
 * n'était possible depuis l'UI. (L'alias reste assignable à `AlertDialogData`
 * grâce à l'index signature implicite des types littéraux.)
 */
export type TaxonomyDeletePayload = {
	id: string;
	displayName: string;
	usageCount?: number;
};

interface TaxonomyDeleteAlertDialogProps {
	config: TaxonomyConfig;
	/** Action de formulaire renvoyée par le hook de suppression. */
	action: (formData: FormData) => void;
	isPending: boolean;
	/** Ferme le dialog puis revient à la liste — fourni par le module appelant. */
	onDeleted: () => void;
}

export function TaxonomyDeleteAlertDialog({
	config,
	action,
}: Omit<TaxonomyDeleteAlertDialogProps, "onDeleted" | "isPending">) {
	const dialog = useAlertDialog<TaxonomyDeletePayload>(config.deleteDialogId);
	const data = dialog.data;

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={dialog.close}
			action={action}
			tone="destructive"
			fields={{ [config.formFields.deleteId]: data?.id }}
			title={config.deleteDialogTitle}
			confirmLabel="Supprimer"
			descriptionClassName="space-y-3"
			description={
				<>
					<p>
						Êtes-vous sûr de vouloir supprimer {config.labels.definite}{" "}
						<strong>&quot;{data?.displayName}&quot;</strong> ?
					</p>
					{data?.usageCount != null && data.usageCount > 0 && (
						<p className="text-destructive font-medium">
							Impossible : {formatUsage(config, data.usageCount)} utilise
							{data.usageCount > 1 ? "nt" : ""} encore {config.labels.definite}. Retirez
							{data.usageCount > 1 ? "-les" : "-le"} avant de supprimer.
						</p>
					)}
					<p className="text-destructive font-medium">Cette action est irréversible.</p>
				</>
			}
		/>
	);
}

/**
 * Hook de câblage : ferme le dialog et revient à la liste après suppression.
 * Chaque module l'appelle avec son propre hook de suppression.
 */
export function useTaxonomyDeleteDialog(config: TaxonomyConfig) {
	const deleteDialog = useAlertDialog<TaxonomyDeletePayload>(config.deleteDialogId);
	const backToList = useBackToListOnDelete(config.basePath);

	return () => {
		deleteDialog.close();
		backToList();
	};
}
