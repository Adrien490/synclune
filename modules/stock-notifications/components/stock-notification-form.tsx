"use client";

import { useOptimistic, useTransition, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { useSubscribeToStockNotification } from "../hooks/use-subscribe-to-stock-notification";
import { Bell, CheckCircle } from "lucide-react";
import { ActionStatus } from "@/shared/types/server-action";

interface StockNotificationFormProps {
	skuId: string;
}

/**
 * StockNotificationForm - Formulaire compact pour les notifications de retour en stock
 *
 * Affiché sur la page produit quand un SKU est en rupture de stock.
 * Permet à l'utilisateur de s'inscrire pour être notifié par email.
 * Utilise useOptimistic pour un feedback de confirmation immédiat.
 */
export function StockNotificationForm({ skuId }: StockNotificationFormProps) {
	const [, startTransition] = useTransition();
	const [consent, setConsent] = useState(false);

	// Optimistic state pour feedback immédiat
	const [optimisticSubscribed, setOptimisticSubscribed] = useOptimistic(false);

	// Hook avec callbacks pour gérer le rollback
	const { state, action, isPending } = useSubscribeToStockNotification({
		onError: () => {
			// Rollback de l'état optimiste en cas d'erreur
			startTransition(() => {
				setOptimisticSubscribed(false);
			});
		},
	});

	// L'inscription est considérée réussie si optimistic OU state.status === SUCCESS
	const isSuccess = optimisticSubscribed || state?.status === ActionStatus.SUCCESS;

	// Si inscription réussie (optimistic ou réel), afficher un message de confirmation
	if (isSuccess) {
		return (
			<div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 text-sm">
				<CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" aria-hidden="true" />
				<p className="text-green-700 dark:text-green-300">
					{state?.message || "Tu seras notifié(e) dès le retour en stock !"}
				</p>
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

	// Handler pour déclencher l'optimistic update
	const handleSubmit = () => {
		startTransition(() => {
			setOptimisticSubscribed(true);
		});
	};

	return (
		<form
			action={action}
			onSubmit={handleSubmit}
			className="space-y-3 p-3 bg-muted/30 rounded-lg border"
			data-pending={isPending ? "" : undefined}
			aria-busy={isPending}
		>
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
					inputMode="email"
					autoComplete="email"
					spellCheck={false}
					autoCorrect="off"
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
