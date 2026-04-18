"use client";

import { CalendarClock, LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { useAppForm } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { scheduleClosure } from "../../actions/schedule-closure";

export function ScheduleClosureForm() {
	const form = useAppForm({
		defaultValues: { scheduledCloseAt: "", closureMessage: "", reopensAt: "" },
	});

	const [, formAction, isPending] = useActionState(
		withCallbacks(scheduleClosure, {
			...createToastCallbacks({ loadingMessage: "Programmation de la fermeture..." }),
			onSuccess: (result) => {
				createToastCallbacks({ loadingMessage: "Programmation de la fermeture..." }).onSuccess(
					result,
				);
				form.reset();
			},
		}),
		undefined,
	);

	return (
		<form action={formAction} className="space-y-4" aria-busy={isPending}>
			<form.AppField name="scheduledCloseAt">
				{(field) => (
					<field.DateTimeField
						label="Date de fermeture"
						placeholder="Sélectionner une date"
						required
						disabled={isPending}
					/>
				)}
			</form.AppField>

			<form.AppField name="closureMessage">
				{(field) => (
					<field.TextareaField
						label="Message affiché aux clients"
						placeholder="Fermeture exceptionnelle pour congés annuels..."
						maxLength={500}
						showCounter
						rows={3}
						required
						disabled={isPending}
					/>
				)}
			</form.AppField>

			<form.AppField name="reopensAt">
				{(field) => (
					<field.DateTimeField
						label="Date de réouverture automatique"
						placeholder="Sélectionner une date"
						optional
						disabled={isPending}
					/>
				)}
			</form.AppField>
			<p className="text-muted-foreground text-xs">
				Optionnel : la boutique sera réouverte automatiquement à cette date.
			</p>

			<form.Subscribe
				selector={(state) => ({
					scheduledCloseAt: state.values.scheduledCloseAt,
					closureMessage: state.values.closureMessage,
				})}
			>
				{({ scheduledCloseAt, closureMessage }) => (
					<div className="flex justify-end">
						<Button
							type="submit"
							disabled={isPending || !scheduledCloseAt || !closureMessage.trim()}
							aria-busy={isPending}
							onClick={() => triggerHaptic("medium")}
							className="min-h-11"
						>
							{isPending ? (
								<LoaderCircle className="mr-2 size-4 animate-spin" />
							) : (
								<CalendarClock className="mr-2 size-4" />
							)}
							{isPending ? "Programmation..." : "Programmer la fermeture"}
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	);
}
