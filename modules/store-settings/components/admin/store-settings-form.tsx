"use client";

import { useActionState } from "react";

import { useAppForm } from "@/shared/components/forms";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { toggleStoreClosure } from "../../actions/toggle-store-closure";
import type { StoreSettingsAdmin } from "../../types/store-settings.types";
import {
	TOGGLE_STORE_CLOSURE_DIALOG_ID,
	ToggleStoreClosureAlertDialog,
} from "./toggle-store-closure-alert-dialog";

function formatDateForInput(date: Date): string {
	const d = new Date(date);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	const hours = String(d.getHours()).padStart(2, "0");
	const minutes = String(d.getMinutes()).padStart(2, "0");
	return `${year}-${month}-${day}T${hours}:${minutes}`;
}

interface StoreSettingsFormProps {
	settings: StoreSettingsAdmin;
}

export function StoreSettingsForm({ settings }: StoreSettingsFormProps) {
	const form = useAppForm({
		defaultValues: {
			isClosed: settings.isClosed,
			closureMessage: settings.closureMessage ?? "",
			reopensAt: settings.reopensAt ? formatDateForInput(settings.reopensAt) : "",
		},
	});

	const confirmDialog = useAlertDialog(TOGGLE_STORE_CLOSURE_DIALOG_ID);

	const [, formAction, isPending] = useActionState(
		withCallbacks(toggleStoreClosure, {
			...createToastCallbacks({}),
			onSuccess: (result) => {
				createToastCallbacks({}).onSuccess?.(result);
				confirmDialog.close();
			},
		}),
		undefined,
	);

	const closedAtFormatted = settings.closedAt
		? new Intl.DateTimeFormat("fr-FR", {
				dateStyle: "medium",
				timeStyle: "short",
			}).format(new Date(settings.closedAt))
		: null;

	const handleSubmit = () => {
		const values = form.state.values;
		confirmDialog.open({
			isClosed: values.isClosed,
			closureMessage: values.closureMessage,
			reopensAt: values.reopensAt,
		});
	};

	return (
		<>
			<div className="space-y-6">
				{/* Current status badge */}
				<div className="flex items-start gap-3">
					<span className="text-muted-foreground mt-0.5 text-sm font-medium">Statut actuel :</span>
					<div>
						{settings.isClosed ? (
							<Badge variant="destructive">Fermée</Badge>
						) : (
							<Badge variant="success">Ouverte</Badge>
						)}
						{settings.isClosed && closedAtFormatted && settings.closedBy && (
							<p className="text-muted-foreground mt-1 text-xs">
								par {settings.closedBy} le {closedAtFormatted}
							</p>
						)}
					</div>
				</div>

				{/* Toggle switch */}
				<form.AppField name="isClosed">
					{(field) => <field.SwitchField label="Boutique fermée" />}
				</form.AppField>

				{/* Closure fields (visible only when closing) */}
				<form.Subscribe selector={(state) => state.values.isClosed}>
					{(isClosed) =>
						isClosed ? (
							<div className="space-y-4">
								<form.AppField name="closureMessage">
									{(field) => (
										<field.TextareaField
											label="Message de fermeture"
											placeholder="La boutique est temporairement fermée pour maintenance..."
											maxLength={500}
											showCounter
											rows={3}
											required
										/>
									)}
								</form.AppField>

								<form.AppField name="reopensAt">
									{(field) => (
										<field.DateTimeField
											label="Date de réouverture"
											placeholder="Sélectionner une date"
											optional
										/>
									)}
								</form.AppField>
								<p className="text-muted-foreground text-xs">
									Informative uniquement — la boutique ne réouvrira pas automatiquement.
								</p>
							</div>
						) : null
					}
				</form.Subscribe>

				<form.Subscribe
					selector={(state) => ({
						isClosed: state.values.isClosed,
						closureMessage: state.values.closureMessage,
						canSubmit: state.canSubmit,
					})}
				>
					{({ isClosed, closureMessage, canSubmit }) => (
						<Button
							type="button"
							variant={isClosed ? "destructive" : "default"}
							disabled={!canSubmit || isPending || (isClosed && !closureMessage.trim())}
							onClick={handleSubmit}
						>
							{isClosed ? "Fermer la boutique" : "Réouvrir la boutique"}
						</Button>
					)}
				</form.Subscribe>
			</div>

			<ToggleStoreClosureAlertDialog action={formAction} isPending={isPending} />
		</>
	);
}
