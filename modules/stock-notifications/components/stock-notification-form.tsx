"use client";

import { useActionState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { subscribeToStockNotification } from "../actions/subscribe-to-stock-notification";
import { Bell, CheckCircle } from "lucide-react";
import { ActionStatus } from "@/shared/types/server-action";
import { useState } from "react";

interface StockNotificationFormProps {
	skuId: string;
}

/**
 * StockNotificationForm - Formulaire compact pour les notifications de retour en stock
 *
 * Affiché sur la page produit quand un SKU est en rupture de stock.
 * Permet à l'utilisateur de s'inscrire pour être notifié par email.
 */
export function StockNotificationForm({ skuId }: StockNotificationFormProps) {
	const [state, action, isPending] = useActionState(
		subscribeToStockNotification,
		undefined
	);
	const [consent, setConsent] = useState(false);

	// Si inscription réussie, afficher un message de confirmation
	if (state?.status === ActionStatus.SUCCESS) {
		return (
			<div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 text-sm">
				<CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" aria-hidden="true" />
				<p className="text-green-700 dark:text-green-300">{state.message}</p>
			</div>
		);
	}

	// Si déjà inscrit (CONFLICT), afficher le message
	if (state?.status === ActionStatus.CONFLICT) {
		return (
			<div className="flex items-start gap-2 p-3 bg-accent/50 rounded-lg border text-sm">
				<Bell className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
				<p className="text-muted-foreground">{state.message}</p>
			</div>
		);
	}

	return (
		<form action={action} className="space-y-3 p-3 bg-muted/30 rounded-lg border">
			<p className="text-xs font-medium flex items-center gap-1.5">
				<Bell className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
				Me prévenir du retour en stock
			</p>

			<input type="hidden" name="skuId" value={skuId} />
			<input type="hidden" name="consent" value={consent ? "true" : "false"} />

			<div>
				<Input
					type="email"
					name="email"
					required
					placeholder="ton@email.com"
					className="h-9 text-sm"
					aria-label="Adresse email pour notification de retour en stock"
					aria-describedby="email-notification-help"
				/>
				<span id="email-notification-help" className="sr-only">
					Nous t'enverrons un email des que ce produit sera disponible
				</span>
			</div>

			<div className="flex items-start gap-3">
				<Checkbox
					id="stock-notification-consent"
					checked={consent}
					onCheckedChange={(checked) => setConsent(checked === true)}
					className="mt-0.5 size-5"
				/>
				<Label
					htmlFor="stock-notification-consent"
					className="text-sm sm:text-xs text-muted-foreground leading-relaxed sm:leading-tight cursor-pointer"
				>
					J'accepte d'etre notifie(e) par email lorsque ce produit sera de nouveau disponible
				</Label>
			</div>

			{state?.status === ActionStatus.VALIDATION_ERROR && (
				<p className="text-xs text-destructive" role="alert">
					{state.message}
				</p>
			)}

			{state?.status === ActionStatus.ERROR && (
				<p className="text-xs text-destructive" role="alert">
					{state.message}
				</p>
			)}

			<Button
				type="submit"
				size="sm"
				className="w-full"
				disabled={isPending || !consent}
			>
				<Bell className="w-3 h-3 mr-1.5" aria-hidden="true" />
				<span>{isPending ? "Inscription..." : "M'alerter"}</span>
			</Button>
		</form>
	);
}
