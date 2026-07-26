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
	AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { Label } from "@/shared/components/ui/label";
import { useDeleteAccount } from "@/modules/users/hooks/use-delete-account";
import { USER_CONSTANTS } from "@/modules/users/constants/user.constants";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";

const CONFIRMATION_TEXT = USER_CONSTANTS.ACCOUNT_DELETION_CONFIRMATION;

export function DeleteAccountDialog() {
	const [open, setOpen] = useState(false);
	const [confirmation, setConfirmation] = useState("");

	const isConfirmed = confirmation === CONFIRMATION_TEXT;

	const { state, action, isPending } = useDeleteAccount({
		onSuccess: () => {
			setOpen(false);
		},
	});

	// `createToastCallbacks` retire les VALIDATION_ERROR du toast (affichage inline
	// supposé) : sans cette alerte, un refus du schéma serveur serait muet.
	const serverErrors = useServerFieldErrors({ state });

	/**
	 * Garde de resoumission — équivalent local de `useGatedFormSubmit`, qui n'est
	 * pas applicable ici : ce formulaire n'a pas d'instance TanStack Form (pas de
	 * `handleSubmit`/`state.isValid` à attendre), juste un `useActionState`.
	 *
	 * `disabled` sur `AlertDialogAction` ne couvre pas la touche Entrée depuis le
	 * champ de confirmation, et `useActionState` sérialise les dispatchs au lieu
	 * de les ignorer : sans ce garde, deux Entrée rapides = deux demandes de
	 * suppression de compte. `action={action}` reste posé sur le <form> pour le
	 * chemin sans JS.
	 */
	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isPending || !isConfirmed) return;
		action(new FormData(event.currentTarget));
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (isPending) return;
		setOpen(newOpen);
		if (!newOpen) {
			setConfirmation("");
		}
	};

	return (
		<AlertDialog open={open} onOpenChange={handleOpenChange}>
			<AlertDialogTrigger asChild>
				<Button variant="destructive">Supprimer mon compte</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Supprimer votre compte ?</AlertDialogTitle>
					<AlertDialogDescription>
						Votre compte sera supprimé après un délai de 30 jours. Vous pourrez annuler cette
						demande en vous reconnectant pendant cette période.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="text-muted-foreground space-y-2 text-sm">
					<ul className="list-inside list-disc space-y-1">
						<li>Vos informations personnelles</li>
						<li>Vos adresses</li>
						<li>Vos favoris</li>
						<li>Votre panier</li>
					</ul>
					<p>
						Vos commandes seront conservées de manière anonymisée pour des raisons comptables
						légales.
					</p>
				</div>

				<form action={action} onSubmit={handleSubmit}>
					<FormServerErrorAlert errors={serverErrors} className="mb-4" />
					<div className="space-y-2 py-4">
						<Label htmlFor="confirmation">
							Tapez <span className="font-mono font-bold">{CONFIRMATION_TEXT}</span> pour confirmer
						</Label>
						{/*
						 * Champ sentinelle : la valeur doit correspondre EXACTEMENT à
						 * CONFIRMATION_TEXT (comparaison stricte ci-dessus). Sans ces
						 * attributs, iOS met une majuscule au premier caractère et
						 * l'autocorrection réécrit le mot → l'utilisateur tape le bon
						 * texte et le bouton reste grisé, sans explication possible.
						 */}
						<Input
							id="confirmation"
							name="confirmation"
							value={confirmation}
							onChange={(e) => setConfirmation(e.target.value)}
							placeholder={CONFIRMATION_TEXT}
							disabled={isPending}
							autoComplete="off"
							autoCapitalize="none"
							autoCorrect="off"
							spellCheck={false}
							enterKeyHint="done"
						/>
					</div>

					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={!isConfirmed || isPending}
							aria-busy={isPending}
						>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending ? "Envoi de la demande…" : "Demander la suppression"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
