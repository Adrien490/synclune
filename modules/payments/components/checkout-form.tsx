"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createCheckoutSession } from "@/modules/payments/actions/create-checkout-session";
import { SHIPPING_RATES } from "@/modules/orders/constants/shipping-rates";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/shared/components/ui/native-select";
import { Spinner } from "@/shared/components/ui/spinner";
import {
	COUNTRY_NAMES,
	SHIPPING_COUNTRIES,
	type ShippingCountry,
} from "@/shared/constants/countries";
import { ActionStatus } from "@/shared/types/server-action";
import { formatEuro } from "@/shared/utils/format-euro";

interface CheckoutFormProps {
	/** Sous-total du panier en centimes, recalculé côté serveur. */
	subtotalCents: number;
}

/**
 * Choix du pays de livraison + départ vers Stripe Checkout.
 *
 * Le pays fixe les frais de port ET la seule adresse acceptée par la page
 * Stripe (`allowed_countries: [pays]`) : pas de port France payé pour une
 * livraison en Allemagne. Les montants affichés ici sont indicatifs — tout est
 * recalculé en base par `createCheckoutSession`.
 */
export function CheckoutForm({ subtotalCents }: CheckoutFormProps) {
	const [country, setCountry] = useState<ShippingCountry>("FR");
	const [state, action, isPending] = useActionState(createCheckoutSession, undefined);

	const shippingCents = country === "FR" ? SHIPPING_RATES.FR.amount : SHIPPING_RATES.EU.amount;
	const shippingLabel =
		country === "FR" ? SHIPPING_RATES.FR.estimatedDays : SHIPPING_RATES.EU.estimatedDays;

	const errorRef = useRef<HTMLDivElement>(null);
	const isActionError = !!state?.message && state.status !== ActionStatus.SUCCESS;

	useEffect(() => {
		if (isActionError) errorRef.current?.focus();
	}, [state?.message, state?.status, isActionError]);

	return (
		<form action={action} className="space-y-6">
			{isActionError && state.message && (
				<Alert variant="destructive" ref={errorRef} tabIndex={-1}>
					<AlertDescription>{state.message}</AlertDescription>
				</Alert>
			)}

			<div className="space-y-2">
				<Label htmlFor="checkout-country">Pays de livraison</Label>
				<NativeSelect
					id="checkout-country"
					name="country"
					value={country}
					onChange={(event) => setCountry(event.target.value as ShippingCountry)}
					className="w-full"
				>
					{SHIPPING_COUNTRIES.map((code) => (
						<NativeSelectOption key={code} value={code}>
							{COUNTRY_NAMES[code]}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</div>

			<div className="space-y-2 text-sm">
				<div className="flex items-baseline justify-between">
					<span className="text-muted-foreground">Sous-total</span>
					<span className="font-medium">{formatEuro(subtotalCents)}</span>
				</div>
				<div className="flex items-baseline justify-between">
					<span className="text-muted-foreground">Livraison ({shippingLabel})</span>
					<span className="font-medium">{formatEuro(shippingCents)}</span>
				</div>
				<div className="border-border flex items-baseline justify-between border-t pt-2">
					<span>Total</span>
					<span className="font-semibold">{formatEuro(subtotalCents + shippingCents)}</span>
				</div>
			</div>

			<Button type="submit" size="lg" className="w-full" disabled={isPending}>
				{isPending ? (
					<>
						<Spinner aria-hidden="true" />
						Redirection vers le paiement…
					</>
				) : (
					"Payer avec Stripe"
				)}
			</Button>

			<p className="text-muted-foreground text-xs">
				Le paiement se fait sur la page sécurisée de Stripe. Ton adresse de livraison y sera
				demandée.
			</p>
		</form>
	);
}
