"use client";

import { useState, useRef, useEffect, useEffectEvent } from "react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import type { Session } from "@/modules/auth/lib/auth";
import { calculateShipping } from "@/modules/orders/services/shipping.service";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { formatEuro } from "@/shared/utils/format-euro";
import { ArrowLeft, CreditCard, Info, Loader2, Mail, Shield } from "lucide-react";
import {
	SORTED_SHIPPING_COUNTRIES,
	COUNTRY_NAMES,
	type ShippingCountry,
} from "@/shared/constants/countries";
import Link from "next/link";
import { useCheckoutForm } from "../hooks/use-checkout-form";
import { ActionStatus } from "@/shared/types/server-action";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";
import { EmbeddedCheckoutWrapper } from "./embedded-checkout";
import type { CreateCheckoutSessionResult } from "../types/checkout.types";

// Options pour le select des pays
const countryOptions = SORTED_SHIPPING_COUNTRIES.map((code) => ({
	value: code,
	label: COUNTRY_NAMES[code],
}));

interface CheckoutFormProps {
	cart: NonNullable<GetCartReturn>;
	session: Session | null;
	addresses: GetUserAddressesReturn | null;
	onCountryChange?: (country: ShippingCountry) => void;
	onPostalCodeChange?: (postalCode: string) => void;
}

/**
 * Formulaire de checkout simplifié
 * Affiche le formulaire d'adresse puis le paiement Stripe inline
 */
export function CheckoutForm({
	cart,
	session,
	addresses,
	onCountryChange,
	onPostalCodeChange,
}: CheckoutFormProps) {
	const isGuest = !session;

	// State pour le paiement Stripe
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [orderInfo, setOrderInfo] = useState<{
		orderId: string;
		orderNumber: string;
	} | null>(null);

	const handleSuccess = (data: CreateCheckoutSessionResult) => {
		setClientSecret(data.clientSecret);
		setOrderInfo({ orderId: data.orderId, orderNumber: data.orderNumber });
	};

	// Form hook
	const { form, action, isPending, state } = useCheckoutForm({
		session,
		addresses,
		onSuccess: handleSuccess,
	});

	// Progressive disclosure states
	const initialCountry = form.state.values.shipping?.country;
	const [showCountrySelect, setShowCountrySelect] = useState(
		initialCountry !== undefined && initialCountry !== "FR"
	);
	const [showAddressLine2, setShowAddressLine2] = useState(
		!!form.state.values.shipping?.addressLine2
	);

	// Effect Events pour notifier le parent sans causer de re-run quand les callbacks changent
	const notifyCountryChange = useEffectEvent((country: ShippingCountry) => {
		onCountryChange?.(country);
	});

	const notifyPostalCodeChange = useEffectEvent((postalCode: string) => {
		onPostalCodeChange?.(postalCode);
	});

	// Notifier le parent quand le pays change
	const lastCountryRef = useRef<ShippingCountry | undefined>(
		initialCountry as ShippingCountry | undefined
	);
	const currentCountry = form.state.values.shipping?.country as
		| ShippingCountry
		| undefined;

	useEffect(() => {
		const country = currentCountry || "FR";
		if (country !== lastCountryRef.current) {
			lastCountryRef.current = country;
			notifyCountryChange(country);
		}
	}, [currentCountry]);

	// Notifier le parent quand le code postal change (pour le calcul des frais Corse)
	const initialPostalCode = form.state.values.shipping?.postalCode;
	const lastPostalCodeRef = useRef<string | undefined>(initialPostalCode);
	const currentPostalCode = form.state.values.shipping?.postalCode;

	useEffect(() => {
		const postalCode = currentPostalCode || "";
		if (postalCode !== lastPostalCodeRef.current) {
			lastPostalCodeRef.current = postalCode;
			notifyPostalCodeChange(postalCode);
		}
	}, [currentPostalCode]);

	// Calculer le total
	const subtotal = cart.items.reduce((sum, item) => {
		return sum + item.priceAtAdd * item.quantity;
	}, 0);
	const shipping = calculateShipping();
	const total = subtotal + shipping;

	// Si on a le clientSecret, afficher le paiement Stripe
	if (clientSecret) {
		return (
			<div className="space-y-6">
				{/* Bouton retour */}
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setClientSecret(null)}
					className="text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Modifier mon adresse
				</Button>

				{/* En-tête paiement */}
				<div className="space-y-2">
					<h2 className="text-xl font-semibold flex items-center gap-2">
						<CreditCard className="w-5 h-5" />
						Paiement sécurisé
					</h2>
					<p className="text-sm text-muted-foreground">
						Finalise ta commande avec Stripe, leader de la sécurité des
						paiements en ligne.
					</p>
				</div>

				{/* Formulaire Stripe Embedded */}
				<div className="rounded-lg border overflow-hidden">
					<EmbeddedCheckoutWrapper clientSecret={clientSecret} />
				</div>

				{/* Message sécurité */}
				<div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg border text-sm text-muted-foreground">
					<Shield className="w-4 h-4 mt-0.5 shrink-0" />
					<p>
						Tes informations de paiement sont protégées par le chiffrement SSL.
						Je n'enregistre jamais tes coordonnées bancaires.
					</p>
				</div>

				{/* Info commande */}
				{orderInfo && (
					<p className="text-xs text-muted-foreground text-center">
						Commande n°{orderInfo.orderNumber}
					</p>
				)}
			</div>
		);
	}

	return (
		<form
			action={action}
			className="space-y-5 sm:space-y-6"
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
					const shippingValues = v?.shipping as
						| Record<string, string>
						| undefined;
					return (
						<>
							<input
								type="hidden"
								name="shippingAddress"
								value={JSON.stringify({
									fullName: shippingValues?.fullName || "",
									addressLine1: shippingValues?.addressLine1 || "",
									addressLine2: shippingValues?.addressLine2 || "",
									city: shippingValues?.city || "",
									postalCode: shippingValues?.postalCode || "",
									country: shippingValues?.country || "FR",
									phoneNumber: shippingValues?.phoneNumber || "",
								})}
							/>
							{isGuest && (
								<input
									type="hidden"
									name="email"
									value={(v?.email as string) || ""}
								/>
							)}
						</>
					);
				}}
			</form.Subscribe>

			{/* Message d'erreur */}
			{state?.status !== ActionStatus.SUCCESS &&
				state?.message &&
				state.message !== "Données invalides" && (
					<Alert variant="destructive" role="alert" aria-live="assertive">
						<AlertDescription>{state.message}</AlertDescription>
					</Alert>
				)}

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
									enterKeyHint="next"
									spellCheck={false}
									autoCorrect="off"
									autoFocus
									placeholder="ton@email.com"
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
													const shipping = form.state.values.shipping as
														| Record<string, string>
														| undefined;
													localStorage.setItem(
														STORAGE_KEYS.CHECKOUT_FORM_DRAFT,
														JSON.stringify({
															email: form.state.values.email || "",
															shipping: {
																fullName: shipping?.fullName || "",
																addressLine1: shipping?.addressLine1 || "",
																addressLine2: shipping?.addressLine2 || "",
																city: shipping?.city || "",
																postalCode: shipping?.postalCode || "",
																country: shipping?.country || "FR",
																phoneNumber: shipping?.phoneNumber || "",
															},
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

			{/* Nom complet (Baymard: champ unique réduit friction) */}
			<form.AppField
				name="shipping.fullName"
				validators={{
					onChange: ({ value }: { value: string }) => {
						if (!value || value.trim().length < 2) {
							return "Le nom complet doit contenir au moins 2 caractères";
						}
					},
				}}
			>
				{(field) => (
					<field.InputField
						label="Nom complet"
						required
						autoComplete="name"
						autoCapitalize="words"
						autoCorrect="off"
						enterKeyHint="next"
						placeholder="Jean Dupont"
					/>
				)}
			</form.AppField>

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
						enterKeyHint="next"
						placeholder="12 rue des Fleurs"
					/>
				)}
			</form.AppField>

			{showAddressLine2 ? (
				<form.AppField name="shipping.addressLine2">
					{(field) => (
						<field.InputField
							label="Complément d'adresse"
							optional
							placeholder="Appartement, bâtiment, etc."
							autoComplete="address-line2"
							enterKeyHint="next"
						/>
					)}
				</form.AppField>
			) : (
				<button
					type="button"
					aria-expanded={showAddressLine2}
					className="min-h-11 px-3 -mx-3 text-sm text-muted-foreground underline hover:no-underline hover:text-foreground text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
					onClick={() => setShowAddressLine2(true)}
				>
					+ Ajouter un complément d'adresse
				</button>
			)}

			<div className="grid grid-cols-2 gap-3 sm:gap-6">
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
							enterKeyHint="next"
							placeholder="75001"
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
							enterKeyHint="next"
							placeholder="Paris"
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
							autoComplete="country-name"
						/>
					)}
				</form.AppField>
			) : (
				<div className="flex items-center justify-between min-h-11">
					<span className="text-sm">
						Pays : <strong>France</strong>
						<span className="text-muted-foreground ml-1">
							(Livraison UE disponible)
						</span>
					</span>
					<button
						type="button"
						aria-expanded={showCountrySelect}
						className="min-h-11 px-3 text-sm text-muted-foreground underline hover:no-underline hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
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
							enterKeyHint="done"
						/>
						<p className="text-sm text-muted-foreground">
							Utilisé uniquement par le transporteur en cas de problème de
							livraison.
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

			<form.Subscribe selector={(s) => [s.canSubmit]}>
				{([canSubmit]) => (
					<Button
						type="submit"
						className="w-full"
						disabled={!canSubmit || isPending}
						aria-busy={isPending}
					>
						{isPending ? (
							<>
								<Loader2 className="size-4 animate-spin" aria-hidden="true" />
								<span>Validation...</span>
							</>
						) : (
							`Continuer vers le paiement · ${formatEuro(total)}`
						)}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
