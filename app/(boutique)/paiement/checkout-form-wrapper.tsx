"use client";

import { useState } from "react";
import { CheckoutForm } from "@/modules/payments/components/checkout-form";
import { CheckoutSummary } from "@/modules/payments/components/checkout-summary";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import type { Session } from "@/modules/auth/lib/auth";
import type { ShippingCountry } from "@/shared/constants/countries";

interface CheckoutFormWrapperProps {
	cart: NonNullable<GetCartReturn>;
	session: Session | null;
	addresses: GetUserAddressesReturn | null;
}

/**
 * Wrapper client pour le checkout
 * Gère le state partagé entre le formulaire et le récapitulatif
 */
export function CheckoutFormWrapper({
	cart,
	session,
	addresses,
}: CheckoutFormWrapperProps) {
	const [selectedCountry, setSelectedCountry] = useState<ShippingCountry>("FR");
	const [postalCode, setPostalCode] = useState<string>("");

	return (
		<div className="grid lg:grid-cols-3 gap-8">
			{/* Formulaire - 2/3 de la largeur */}
			<div className="lg:col-span-2">
				<ErrorBoundary
					errorMessage="Impossible de charger le formulaire"
					className="p-8 rounded-lg border bg-muted/50"
				>
					<CheckoutForm
						cart={cart}
						session={session}
						addresses={addresses}
						onCountryChange={setSelectedCountry}
						onPostalCodeChange={setPostalCode}
					/>
				</ErrorBoundary>
			</div>

			{/* Récapitulatif - 1/3 de la largeur */}
			<div className="lg:col-span-1">
				<CheckoutSummary
					cart={cart}
					selectedCountry={selectedCountry}
					postalCode={postalCode}
				/>
			</div>
		</div>
	);
}
