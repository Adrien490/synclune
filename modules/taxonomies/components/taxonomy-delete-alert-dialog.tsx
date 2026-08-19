"use client";

import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { useBackToListOnDelete } from "@/shared/hooks/use-back-to-list-on-delete";

import { formatUsage } from "../utils/taxonomy-labels";
import type { TaxonomyConfig } from "../types/taxonomy.types";

/**
 * Charge utile normalisée du dialog de suppression.
 *
 * Les trois modules passaient des clés différentes (`colorId`/`colorName`,
 * `materialId`/`materialName`, `productTypeId`/`label`) ; une seule forme
 * suffit.
 *
 * `usageCount` est le nombre d'entités qui référencent l'étiquette — variantes
 * pour une couleur ou un matériau, produits pour un type. **Il doit compter la
 * même chose que la garde de la Server Action**, c'est-à-dire TOUTES les
 * références et pas seulement les actives : la FK est en ON DELETE RESTRICT,
 * une variante inactive bloque la suppression tout autant. Un compteur filtré
 * annoncerait « 0 » et laisserait cliquer sur un bouton condamné.
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
}

export function TaxonomyDeleteAlertDialog({ config, action }: TaxonomyDeleteAlertDialogProps) {
	const dialog = useAlertDialog<TaxonomyDeletePayload>(config.deleteDialogId);
	const data = dialog.data;
	const usageCount = data?.usageCount ?? 0;
	const isBlocked = usageCount > 0;

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={dialog.close}
			action={action}
			tone="destructive"
			fields={{ [config.formFields.deleteId]: data?.id }}
			title={config.deleteDialogTitle}
			confirmLabel="Supprimer"
			// La suppression échouerait côté serveur (FK RESTRICT) : mieux vaut un
			// bouton inerte qu'un toast d'erreur après coup. `confirmDisabled` est le
			// SEUL mécanisme de validation admis par `ConfirmDialog` — le dialog se
			// ferme au clic, donc rien de ce qui suit le clic n'est visible.
			confirmDisabled={isBlocked}
			descriptionClassName="space-y-3"
			description={
				<>
					<p>
						Veux-tu vraiment supprimer {config.labels.definite}{" "}
						<strong>«&nbsp;{data?.displayName}&nbsp;»</strong> ?
					</p>
					{isBlocked && (
						<p className="text-destructive font-medium">
							Impossible : {formatUsage(config, usageCount)} utilise
							{usageCount > 1 ? "nt" : ""} encore {config.labels.definite}. Retire
							{usageCount > 1 ? "-les" : "-le"} avant de supprimer.
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
