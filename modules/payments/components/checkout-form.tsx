"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import type { Session } from "@/modules/auth/lib/auth";
import { calculateShipping } from "@/modules/orders/utils/shipping.utils";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { formatEuro } from "@/shared/utils/format-euro";
import { CreditCard, Info, Mail, Shield } from "lucide-react";
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
	onSuccess?: (data: { clientSecret: string; orderId: string; orderNumber: string }) => void;
}

/**
 * Formulaire de checkout simple (sans wizard)
 * Flux continu sans sections
 */
export function CheckoutForm({
	cart,
	session,
	addresses,
	onSuccess,
}: CheckoutFormProps) {
	const isGuest = !session;

	// Form hook
	const { form, action, isPending } = useCheckoutForm({ session, addresses, onSuccess });

	// Progressive disclosure states
	const initialCountry = form.state.values.shipping?.country;
	const [showCountrySelect, setShowCountrySelect] = useState(
		initialCountry !== undefined && initialCountry !== "FR"
	);
	const [showAddressLine2, setShowAddressLine2] = useState(
		!!form.state.values.shipping?.addressLine2
	);

	// Calculer le total
	const subtotal = cart.items.reduce((sum, item) => {
		return sum + item.priceAtAdd * item.quantity;
	}, 0);
	const shipping = calculateShipping();
	const total = subtotal + shipping;

	return (
		<form
			action={action}
			className="space-y-6"
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
						</>
					);
				}}
			</form.Subscribe>

			<form.AppForm>
				<form.FormErrorDisplay />
			</form.AppForm>

			{/* Email (guests uniquement) */}
			{isGuest && (
				<>
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
									inputMode="email"
									autoComplete="email"
									spellCheck={false}
									autoCorrect="off"
									autoFocus
								/>
								<p className="text-sm text-muted-foreground flex items-start gap-1.5">
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
				</>
			)}

			{/* Email affiché pour utilisateurs connectés */}
			{!isGuest && session?.user?.email && (
				<Alert>
					<Mail className="h-4 w-4" />
					<AlertDescription>
						Email de contact : <strong>{session.user.email}</strong>
					</AlertDescription>
				</Alert>
			)}

			{/* Adresse de livraison */}
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
							autoCapitalize="words"
							autoCorrect="off"
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
							autoCapitalize="words"
							autoCorrect="off"
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

			{showAddressLine2 ? (
				<form.AppField name="shipping.addressLine2">
					{(field) => (
						<field.InputField
							label="Complément d'adresse"
							placeholder="Appartement, bâtiment, etc."
							autoComplete="address-line2"
						/>
					)}
				</form.AppField>
			) : (
				<button
					type="button"
					aria-expanded={showAddressLine2}
					className="text-sm text-muted-foreground underline hover:no-underline hover:text-foreground text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
					onClick={() => setShowAddressLine2(true)}
				>
					+ Ajouter un complement d'adresse (appartement, batiment...)
				</button>
			)}

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
							inputMode="numeric"
							pattern="[0-9]*"
							autoComplete="postal-code"
							autoCorrect="off"
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

			{showCountrySelect ? (
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
			) : (
				<div className="flex items-center justify-between py-2">
					<span className="text-sm">
						Pays : <strong>France</strong>
						<span className="text-muted-foreground ml-1">(Livraison UE disponible)</span>
					</span>
					<button
						type="button"
						aria-expanded={showCountrySelect}
						className="text-sm text-muted-foreground underline hover:no-underline hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
						onClick={() => setShowCountrySelect(true)}
					>
						Modifier
					</button>
				</div>
			)}

			<form.AppField name="shipping.phoneNumber">
				{(field) => (
					<div className="space-y-2">
						<field.PhoneField
							label="Téléphone"
							required
							defaultCountry="FR"
							placeholder="06 12 34 56 78"
						/>
						<p className="text-sm text-muted-foreground">
							Utilisé uniquement par le transporteur en cas de problème de livraison (absence, adresse introuvable). Jamais de démarchage.
						</p>
					</div>
				)}
			</form.AppField>

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
						<p className="text-sm text-muted-foreground ml-8">
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

			{/* Bouton de paiement - sticky sur mobile */}
			<div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 py-4 -mx-4 px-4 sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:py-0 sm:mx-0 space-y-3">
				<Button
					type="submit"
					size="lg"
					className="w-full text-base h-14 relative overflow-hidden group"
					disabled={isPending}
				>
					<CreditCard className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
					{isPending ? "Validation..." : `Continuer vers le paiement · ${formatEuro(total)}`}
					<span className="absolute inset-0 bg-linear-to-r from-accent/0 via-accent/20 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
				</Button>

				{/* Message sécurité condensé */}
				<p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
					<Shield className="w-3.5 h-3.5" />
					Paiement sécurisé par Stripe
				</p>
			</div>
		</form>
	);
}
