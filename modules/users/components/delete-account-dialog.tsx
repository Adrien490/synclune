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
import { Label } from "@/shared/components/ui/label";
import { useDeleteAccount } from "@/modules/users/hooks/use-delete-account";
import { USER_CONSTANTS } from "@/modules/users/constants/profile.constants";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const CONFIRMATION_TEXT = USER_CONSTANTS.ACCOUNT_DELETION_CONFIRMATION;

export function DeleteAccountDialog() {
	const [open, setOpen] = useState(false);
	const [confirmation, setConfirmation] = useState("");

	const isConfirmed = confirmation === CONFIRMATION_TEXT;

	const { action, isPending } = useDeleteAccount({
		onSuccess: () => {
			setOpen(false);
		},
	});

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
						Cette action est irréversible. Toutes vos données personnelles
						seront supprimées conformément au RGPD.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="text-sm text-muted-foreground space-y-2">
					<ul className="list-disc list-inside space-y-1">
						<li>Vos informations personnelles</li>
						<li>Vos adresses</li>
						<li>Vos favoris</li>
						<li>Votre panier</li>
					</ul>
					<p>
						Vos commandes seront conservées de manière anonymisée pour des
						raisons comptables légales.
					</p>
				</div>

				<form action={action}>
					<div className="space-y-2 py-4">
						<Label htmlFor="confirmation">
							Tapez <span className="font-mono font-bold">{CONFIRMATION_TEXT}</span> pour confirmer
						</Label>
						<Input
							id="confirmation"
							name="confirmation"
							value={confirmation}
							onChange={(e) => setConfirmation(e.target.value)}
							placeholder={CONFIRMATION_TEXT}
							disabled={isPending}
						/>
					</div>

					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={!isConfirmed || isPending}
							aria-busy={isPending}
						>
							{isPending && <Loader2 className="animate-spin" />}
							{isPending ? "Suppression..." : "Supprimer définitivement"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
