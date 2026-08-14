"use client";

import { CheckoutSection } from "./checkout-section";
import type { CheckoutFormInstance } from "../hooks/use-checkout-form";

interface CheckoutContactSectionProps {
	form: CheckoutFormInstance;
	/** Première étape du tunnel — accent rose, cf. `CheckoutSection`. */
	isComplete?: boolean;
}

/**
 * Le parcours d'achat est 100 % invité (migration lean, lot 1) : plus de
 * branche « connectée » (affichage d'email de compte, « Ce n'est pas moi »),
 * l'email est toujours saisi ici.
 */
export function CheckoutContactSection({ form, isComplete }: CheckoutContactSectionProps) {
	return (
		<CheckoutSection title="Contact" accent="rose" isComplete={isComplete}>
			<div className="space-y-5">
				<form.AppField
					name="email"
					validators={{
						onDynamic: ({ value }: { value: string }) => {
							if (!value) return "L'adresse email est requise";
							if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
								return "Entre une adresse email valide";
							}
							return undefined;
						},
					}}
				>
					{/* Pas de lien « Connecte-toi » ici : la connexion est réservée à
					    l'administration (plus de compte client), et le suivi de commande
					    passe par le lien tokenisé de l'email de confirmation. */}
					{(field) => (
						<field.InputField
							label="Adresse email"
							type="email"
							required
							inputMode="email"
							autoComplete="email"
							enterKeyHint="next"
							spellCheck={false}
							autoCorrect="off"
							autoCapitalize="none"
						/>
					)}
				</form.AppField>
			</div>
		</CheckoutSection>
	);
}
