"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { requestRetractation } from "@/modules/retractations/actions/request-retractation";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { ActionStatus } from "@/shared/types/server-action";

interface RetractationRequestFormProps {
	orderId: string;
	token: string;
	/** Fenêtre légale écoulée : le formulaire reste SOUMETTABLE (droit de demande). */
	isPastDeadline: boolean;
	daysRemaining: number;
}

/**
 * Formulaire public de rétractation — replié derrière un bouton « Me
 * rétracter ». Le motif est OPTIONNEL (la cliente n'a pas à se justifier).
 */
export function RetractationRequestForm({
	orderId,
	token,
	isPastDeadline,
	daysRemaining,
}: RetractationRequestFormProps) {
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [state, action, isPending] = useActionState(requestRetractation, undefined);

	const feedbackRef = useRef<HTMLDivElement>(null);
	const hasFeedback = !!state?.message;
	const isSuccess = state?.status === ActionStatus.SUCCESS;

	useEffect(() => {
		if (hasFeedback) feedbackRef.current?.focus();
	}, [hasFeedback, state?.status]);

	if (isSuccess) {
		return (
			<Alert ref={feedbackRef} tabIndex={-1}>
				<AlertDescription>{state.message}</AlertDescription>
			</Alert>
		);
	}

	if (!isFormOpen) {
		return (
			<div className="space-y-2 text-center">
				<Button variant="outline" onClick={() => setIsFormOpen(true)}>
					Me rétracter
				</Button>
				<p className="text-muted-foreground text-xs">
					{isPastDeadline
						? "Le délai légal de 14 jours est dépassé — tu peux quand même envoyer une demande, elle sera examinée."
						: `Tu disposes encore de ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""} pour te rétracter, sans avoir à te justifier.`}
				</p>
			</div>
		);
	}

	return (
		<form action={action} className="space-y-4 text-left">
			{hasFeedback && (
				<Alert variant="destructive" ref={feedbackRef} tabIndex={-1}>
					<AlertDescription>{state.message}</AlertDescription>
				</Alert>
			)}

			<input type="hidden" name="orderId" value={orderId} />
			<input type="hidden" name="token" value={token} />

			<div className="space-y-2">
				<Label htmlFor="retractation-reason">Motif (facultatif)</Label>
				<Textarea
					id="retractation-reason"
					name="reason"
					rows={3}
					maxLength={1000}
					placeholder="Tu n'as pas à te justifier — mais un mot nous aide à nous améliorer."
				/>
			</div>

			{isPastDeadline && (
				<p className="text-muted-foreground text-xs">
					Le délai légal est dépassé : ta demande sera examinée à la main.
				</p>
			)}

			<div className="flex gap-2">
				<Button type="submit" disabled={isPending}>
					{isPending ? "Envoi…" : "Envoyer ma demande"}
				</Button>
				<Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>
					Annuler
				</Button>
			</div>
		</form>
	);
}
