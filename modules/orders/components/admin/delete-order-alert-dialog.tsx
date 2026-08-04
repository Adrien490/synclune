"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FieldLabel } from "@/shared/components/forms/field-label";
import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDeleteOrder } from "@/modules/orders/hooks/use-delete-order";
import { Spinner } from "@/shared/components/ui/spinner";

export const DELETE_ORDER_DIALOG_ID = "delete-order";

interface DeleteOrderData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

interface DeleteOrderAlertDialogProps {
	/**
	 * Où aller après une suppression réussie.
	 *
	 * Requis quand le dialog est monté sur la page détail de la commande : celle-ci
	 * porte l'entité qu'on vient de supprimer, donc rester dessus laisse l'admin sur
	 * une page morte. Sur la page LISTE, ne rien passer — la liste se revalide seule.
	 * `replace` (et non `push`) : l'URL du détail supprimé n'a rien à faire dans
	 * l'historique de navigation.
	 */
	successPath?: string;
}

export function DeleteOrderAlertDialog({ successPath }: DeleteOrderAlertDialogProps = {}) {
	const deleteDialog = useAlertDialog<DeleteOrderData>(DELETE_ORDER_DIALOG_ID);
	const router = useRouter();
	const [reason, setReason] = useState("");

	const { state, action, isPending } = useDeleteOrder({
		onSuccess: () => {
			setReason("");
			deleteDialog.close();
			if (successPath) {
				router.replace(successPath);
			}
		},
	});

	// `createToastCallbacks` retire les VALIDATION_ERROR du toast (affichage inline
	// supposé) : sans cette alerte, un refus du schéma serveur serait muet.
	const serverErrors = useServerFieldErrors({ state });

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			setReason("");
			deleteDialog.close();
		}
	};

	return (
		// `tone` absent = `neutral` = bouton d'action PRIMAIRE pour une suppression
		// définitive. La friction était déjà correcte (motif obligatoire + bouton
		// désactivé) ; seule la couleur mentait.
		<ResponsiveAlertDialog
			open={deleteDialog.isOpen}
			onOpenChange={handleOpenChange}
			tone="destructive"
		>
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<FormServerErrorAlert errors={serverErrors} className="mb-4" />
					<input type="hidden" name="id" value={deleteDialog.data?.orderId ?? ""} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Confirmer la suppression</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription render={<div />}>
							<p>
								Êtes-vous sûr de vouloir supprimer la commande{" "}
								<strong>{deleteDialog.data?.orderNumber}</strong> ?
							</p>
							<p className="text-destructive mt-2 font-medium">Cette action est irréversible.</p>
							<p className="text-muted-foreground mt-4 text-sm">
								Note: Seules les commandes sans facture et non payées peuvent être supprimées
								(commandes de test, abandonnées ou échouées).
							</p>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>

					<div className="mt-4 space-y-2">
						<FieldLabel htmlFor="delete-order-reason" required>
							Raison de la suppression
						</FieldLabel>
						<Textarea
							id="delete-order-reason"
							name="reason"
							required
							minLength={3}
							maxLength={500}
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Ex: commande de test, paiement abandonné, doublon créé par erreur…"
							disabled={isPending}
							className="resize-none"
						/>
						<p className="text-muted-foreground text-xs">
							Tracée dans l&apos;audit trail (Art. L123-22, conservation 10 ans).
						</p>
					</div>

					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction
							type="submit"
							disabled={isPending || reason.trim().length < 3}
							aria-busy={isPending}
						>
							{isPending && <Spinner presentational />}
							{isPending ? "Suppression…" : "Supprimer"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
