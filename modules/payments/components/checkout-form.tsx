"use client";

import { FormSection } from "@/shared/components/forms";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import type { Session } from "@/modules/auth/lib/auth";
import { calculateShipping } from "@/modules/orders/utils/shipping.utils";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { formatEuro } from "@/shared/utils/format-euro";
import { CreditCard, Info, Mail, MapPin, Shield } from "lucide-react";
import {
	SORTED_SHIPPING_COUNTRIES,
	COUNTRY_NAMES,
} from "@/shared/constants/countries";
import Link from "next/link";
import { useCheckoutForm } from "../hooks/use-checkout-form";

// Options pour le select des pays
const countryOptions = SORTED_SHIPPING_COUNTRIES.map((code) => ({
	value: code,
	label: COUNTRY_NAMES[code],
}));

interface CheckoutFormProps {
	cart: NonNullable<GetCartReturn>;
	session: Session | null;
	addresses: GetUserAddressesReturn | null;
}

/**
 * Formulaire de checkout simple (sans wizard)
 * Toutes les sections affichées sur une seule page
 */
export function CheckoutForm({
	cart,
	session,
	addresses,
}: CheckoutFormProps) {
	const isGuest = !session;

	// Form hook
	const { form, action, isPending } = useCheckoutForm({ session, addresses });

	// Calculer le total
	const subtotal = cart.items.reduce((sum, item) => {
		return sum + item.priceAtAdd * item.quantity;
	}, 0);
	const shipping = calculateShipping();
	const total = subtotal + shipping;

	return (
		<form
			action={action}
			className="space-y-8"
			onSubmit={() => void form.handleSubmit()}
		>
			{/* Champs cachés */}
			<input
				type="hidden"
				name="cartItems"
				value={JSON.stringify(
					cart.items.map((item) => ({
						skuId: item.sku.id,
						quantity: item.quantity,
					}))
				)}
			/>

			<form.Subscribe selector={(state) => [state.values]}>
				{([values]) => {
					const v = values as Record<string, unknown>;
					const shippingValues = v?.shipping as Record<string, string> | undefined;
					return (
						<>
							<input
								type="hidden"
								name="shippingAddress"
								value={JSON.stringify({
									firstName: shippingValues?.firstName || "",
									lastName: shippingValues?.lastName || "",
									addressLine1: shippingValues?.addressLine1 || "",
									addressLine2: shippingValues?.addressLine2 || "",
									city: shippingValues?.city || "",
									postalCode: shippingValues?.postalCode || "",
									country: shippingValues?.country || "FR",
									phoneNumber: shippingValues?.phoneNumber || "",
								})}
							/>
							{isGuest && <input type="hidden" name="email" value={(v?.email as string) || ""} />}
							{!isGuest && <input type="hidden" name="saveAddress" value={v?.saveAddress ? "true" : "false"} />}
						</>
					);
				}}
			</form.Subscribe>

			<form.AppForm>
				<form.FormErrorDisplay />
			</form.AppForm>

			{/* Section Email (guests uniquement) */}
			{isGuest && (
				<FormSection
					title="Contact"
					description="Ton adresse email"
					icon={<Mail />}
				>
					<div className="space-y-4">
						<form.AppField
							name="email"
							validators={{
								onChange: ({ value }: { value: string }) => {
									if (!value) return "L'adresse email est requise";
									if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
										return "Entre une adresse email valide";
									}
								},
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<field.InputField
										label="Adresse email"
										type="email"
										required
										autoComplete="email"
										autoFocus
									/>
									<p className="text-xs text-muted-foreground flex items-start gap-1.5">
										<Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
										<span>
											Tu as déjà un compte ?{" "}
											<Link
												href="/connexion?callbackURL=/paiement"
												className="text-foreground underline hover:no-underline font-medium"
												onClick={() => {
													if (typeof window !== "undefined") {
														localStorage.setItem(
															"checkout-form-draft",
															JSON.stringify({
																email: form.state.values.email || "",
																shipping: form.state.values.shipping || {},
																timestamp: Date.now(),
															})
														);
													}
												}}
											>
												Connecte-toi
											</Link>{" "}
											pour accéder à tes adresses enregistrées
										</span>
									</p>
								</div>
							)}
						</form.AppField>

						<Alert>
							<Info className="h-4 w-4" />
							<AlertDescription>
								Tu peux commander sans créer de compte. Un email de confirmation
								te sera envoyé à l'adresse indiquée.
							</AlertDescription>
						</Alert>
					</div>
				</FormSection>
			)}

			{/* Section Adresse de livraison */}
			<FormSection
				title="Adresse de livraison"
				description="Où souhaites-tu recevoir ta commande ?"
				icon={<MapPin />}
			>
				{/* Email affiché pour utilisateurs connectés */}
				{!isGuest && session?.user?.email && (
					<Alert className="mb-6">
						<Mail className="h-4 w-4" />
						<AlertDescription>
							Email de contact : <strong>{session.user.email}</strong>
						</AlertDescription>
					</Alert>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<form.AppField
						name="shipping.firstName"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value || value.trim().length < 2) {
									return "Le prénom doit contenir au moins 2 caractères";
								}
							},
						}}
					>
						{(field) => (
							<field.InputField
								label="Prénom"
								required
								autoComplete="given-name"
							/>
						)}
					</form.AppField>

					<form.AppField
						name="shipping.lastName"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value || value.trim().length < 2) {
									return "Le nom doit contenir au moins 2 caractères";
								}
							},
						}}
					>
						{(field) => (
							<field.InputField
								label="Nom"
								required
								autoComplete="family-name"
							/>
						)}
					</form.AppField>
				</div>

				<form.AppField
					name="shipping.addressLine1"
					validators={{
						onChange: ({ value }: { value: string }) => {
							if (!value || value.trim().length < 5) {
								return "L'adresse doit contenir au moins 5 caractères";
							}
						},
					}}
				>
					{(field) => (
						<field.InputField
							label="Adresse"
							required
							autoComplete="address-line1"
						/>
					)}
				</form.AppField>

				<form.AppField name="shipping.addressLine2">
					{(field) => (
						<div className="space-y-2">
							<field.InputField
								label="Complément d'adresse"
								autoComplete="address-line2"
							/>
							<p className="text-xs text-muted-foreground">
								Appartement, bâtiment, etc.
							</p>
						</div>
					)}
				</form.AppField>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<form.AppField
						name="shipping.postalCode"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value) return "Le code postal est requis";
								if (value.length < 3 || value.length > 10) {
									return "Code postal invalide";
								}
							},
						}}
					>
						{(field) => (
							<field.InputField
								label="Code postal"
								required
								autoComplete="postal-code"
							/>
						)}
					</form.AppField>

					<form.AppField
						name="shipping.city"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value || value.trim().length < 2) {
									return "La ville est requise";
								}
							},
						}}
					>
						{(field) => (
							<field.InputField
								label="Ville"
								required
								autoComplete="address-level2"
							/>
						)}
					</form.AppField>
				</div>

				<form.AppField
					name="shipping.country"
					validators={{
						onChange: ({ value }: { value: string }) => {
							if (!value) return "Le pays est requis";
						},
					}}
				>
					{(field) => (
						<field.SelectField
							label="Pays"
							required
							placeholder="Sélectionner un pays"
							options={countryOptions}
						/>
					)}
				</form.AppField>

				<form.AppField
					name="shipping.phoneNumber"
					validators={{
						onChange: ({ value }: { value: string }) => {
							if (!value) return "Le numéro de téléphone est requis";
							const cleaned = value.replace(/[\s.\-()]/g, "");
							if (!/^(?:\+|00)?[1-9]\d{8,14}$/.test(cleaned)) {
								return "Numéro de téléphone invalide";
							}
						},
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<field.InputField
								label="Téléphone"
								type="tel"
								required
								placeholder="06 12 34 56 78"
								autoComplete="tel"
							/>
							<p className="text-xs text-muted-foreground">
								Pour faciliter la livraison
							</p>
						</div>
					)}
				</form.AppField>

				<Alert>
					<Info className="h-4 w-4" />
					<AlertDescription>
						Livraison en France et Union Européenne uniquement
					</AlertDescription>
				</Alert>

				{!isGuest && (
					<form.AppField name="saveAddress">
						{(field) => (
							<div className="space-y-2">
								<field.CheckboxField label="Enregistrer cette adresse pour mes prochaines commandes" />
								<p className="text-xs text-muted-foreground ml-8">
									Cette adresse sera ajoutée à ton carnet d'adresses
								</p>
							</div>
						)}
					</form.AppField>
				)}
			</FormSection>

			{/* Section Conditions et paiement */}
			<FormSection
				title="Conditions et paiement"
				description="Finaliser ta commande"
				icon={<Shield />}
			>
				{/* Droit de rétractation */}
				<Alert className="mb-6">
					<Info className="h-4 w-4" />
					<AlertTitle>Droit de rétractation</AlertTitle>
					<AlertDescription>
						Conformément à la législation française, tu disposes d'un délai de{" "}
						<strong>14 jours</strong> à compter de la réception de ta commande
						pour exercer ton droit de rétractation.{" "}
						<Link
							href="/retractation"
							className="underline hover:no-underline font-medium"
							target="_blank"
							rel="noopener noreferrer"
						>
							En savoir plus
						</Link>
					</AlertDescription>
				</Alert>

				{/* CGV */}
				<form.AppField
					name="termsAccepted"
					validators={{
						onChange: ({ value }: { value: boolean }) => {
							if (!value) {
								return "Tu dois accepter les conditions générales de vente";
							}
						},
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<field.CheckboxField
								label="J'accepte les conditions générales de vente"
								required
							/>
							<p className="text-xs/5 text-muted-foreground ml-8">
								Consultez nos{" "}
								<Link
									href="/cgv"
									className="text-foreground underline hover:no-underline"
									target="_blank"
									rel="noopener noreferrer"
								>
									conditions générales de vente
								</Link>
							</p>
						</div>
					)}
				</form.AppField>

				{/* Message sécurité */}
				<div className="p-4 bg-muted/50 rounded-lg border space-y-3 mt-6">
					<div className="flex items-center gap-2 text-sm font-medium">
						<Shield className="w-4 h-4 text-primary" />
						<span>Paiement sécurisé</span>
					</div>
					<p className="text-xs text-muted-foreground leading-relaxed">
						Tes informations de paiement sont entièrement sécurisées. Je
						n'enregistre jamais tes coordonnées bancaires. Le paiement est
						géré par Stripe, leader de la sécurité des paiements en ligne.
					</p>
				</div>
			</FormSection>

			{/* Bouton de paiement */}
			<div className="space-y-3">
				<Button
					type="submit"
					size="lg"
					className="w-full text-base h-14 relative overflow-hidden group"
					disabled={isPending}
				>
					<CreditCard className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
					{isPending ? "Redirection..." : `Commander · ${formatEuro(total)}`}
					<span className="absolute inset-0 bg-linear-to-r from-accent/0 via-accent/20 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
				</Button>
				<p className="text-xs text-center text-muted-foreground">
					Tu seras redirigé vers Stripe pour le paiement sécurisé
				</p>
			</div>
		</form>
	);
}
