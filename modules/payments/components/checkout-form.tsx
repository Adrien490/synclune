"use client";

import { FormSection } from "@/shared/components/forms";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import type { GetUserAddressesReturn } from "@/modules/users/data/get-user-addresses";
import type { Session } from "@/shared/lib/auth";
import { getFinalShippingCost } from "@/shared/constants/cart-shipping";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { formatEuro } from "@/shared/utils/format-euro";
import { CreditCard, Info, Mail, Shield } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
	SORTED_SHIPPING_COUNTRIES,
	COUNTRY_NAMES,
} from "@/shared/constants/countries";

// Options pour le select des pays
const countryOptions = SORTED_SHIPPING_COUNTRIES.map((code) => ({
	value: code,
	label: COUNTRY_NAMES[code],
}));
import Link from "next/link";
import { useCheckoutForm } from "../hooks/use-checkout-form";

interface CheckoutFormProps {
	cart: NonNullable<GetCartReturn>;
	session: Session | null;
	addresses: GetUserAddressesReturn | null;
	// appliedDiscount: ValidatedDiscountCodeData | null;
}

/**
 * Formulaire de checkout
 * Gère les utilisateurs connectés et les guests
 * Permet de créer un compte pendant le checkout (optionnel)
 */
export function CheckoutForm({
	cart,
	session,
	addresses,
	// appliedDiscount,
}: CheckoutFormProps) {
	const { form, action } = useCheckoutForm({ session, addresses });

	const isGuest = !session;
	

	// Calculer le total pour l'afficher sur le bouton
	const subtotal = cart.items.reduce((sum, item) => {
		return sum + item.priceAtAdd * item.quantity;
	}, 0);
	const shipping = getFinalShippingCost(subtotal);
	// const discountAmount = appliedDiscount?.discountAmount || 0;
	const total = subtotal + shipping;

	return (
		<form
			action={action}
			className="space-y-8"
			onSubmit={() => {
				void form.handleSubmit();
			}}
		>
			{/* Champs cachés pour les données du panier */}
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

			{/* Adresse de livraison (sera remplie dynamiquement par le formulaire) */}
			<form.Subscribe selector={(state) => [state.values]}>
				{([values]) => {
					const shippingAddress = (values as any)?.shipping || {};
					return (
						<input
							type="hidden"
							name="shippingAddress"
							value={JSON.stringify({
								firstName: shippingAddress.firstName || "",
								lastName: shippingAddress.lastName || "",
								addressLine1: shippingAddress.addressLine1 || "",
								addressLine2: shippingAddress.addressLine2 || "",
								city: shippingAddress.city || "",
								postalCode: shippingAddress.postalCode || "",
								country: shippingAddress.country || "FR",
								phoneNumber: shippingAddress.phoneNumber || "",
							})}
						/>
					);
				}}
			</form.Subscribe>

			{/* Adresse de facturation (si différente de livraison) */}
			<form.Subscribe selector={(state) => [state.values]}>
				{([values]) => {
					const billingDifferent = (values as any)?.billingDifferent || false;
					const billingAddress = billingDifferent ? (values as any)?.billing || {} : null;

					// Si billingDifferent = true, envoyer billingAddress, sinon null
					return billingAddress ? (
						<input
							type="hidden"
							name="billingAddress"
							value={JSON.stringify({
								firstName: billingAddress.firstName || "",
								lastName: billingAddress.lastName || "",
								addressLine1: billingAddress.addressLine1 || "",
								addressLine2: billingAddress.addressLine2 || "",
								city: billingAddress.city || "",
								postalCode: billingAddress.postalCode || "",
								country: billingAddress.country || "FR",
								phoneNumber: billingAddress.phoneNumber || "",
							})}
						/>
					) : null;
				}}
			</form.Subscribe>

			{/* Email pour les guests */}
			{isGuest && (
				<form.Subscribe selector={(state) => [state.values]}>
					{([values]) => {
						const email = (values as any)?.email || "";
						return <input type="hidden" name="email" value={email} />;
					}}
				</form.Subscribe>
			)}

			{/* Code promo appliqué - Désactivé temporairement */}
			{/* {appliedDiscount && (
				<input
					type="hidden"
					name="discountCodeId"
					value={appliedDiscount.id}
				/>
			)} */}

			{/* Newsletter opt-in */}
			<form.Subscribe selector={(state) => [state.values]}>
				{([values]) => {
					const newsletter = (values as any)?.newsletter || false;
					return (
						<input
							type="hidden"
							name="newsletter"
							value={newsletter ? "true" : "false"}
						/>
					);
				}}
			</form.Subscribe>

			{/* Checkbox saveAddress pour les utilisateurs connectés */}
			{!isGuest && (
				<form.Subscribe selector={(state) => [state.values]}>
					{([values]) => {
						const saveAddress = (values as any)?.saveAddress || false;
						return (
							<input
								type="hidden"
								name="saveAddress"
								value={saveAddress ? "true" : "false"}
							/>
						);
					}}
				</form.Subscribe>
			)}

			{/* Erreurs globales du formulaire */}
			<form.AppForm>
				<form.FormErrorDisplay />
			</form.AppForm>

			<RequiredFieldsNote />

			
			{/* SECTION 1 : Email (guests uniquement) */}
			{isGuest && (
				<FormSection
					title="Ton email"
					description="Pour recevoir la confirmation de commande"
				>
					<div className="space-y-4">
						<form.AppField
							name="email"
							validators={{
								onChange: ({ value }: { value: string }) => {
									if (!value) {
										return "L'adresse email est requise";
									}
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
										placeholder="sophie.martin@exemple.fr"
										autoComplete="email"
									/>
									<p className="text-xs text-muted-foreground flex items-start gap-1.5">
										<Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
										<span>
											Tu as déjà un compte ?{" "}
											<Link
												href="/connexion?callbackURL=/paiement"
												className="text-foreground underline hover:no-underline font-medium"
												onClick={() => {
													// Sauvegarder les données du formulaire avant la redirection
													if (typeof window !== "undefined") {
														const formValues = form.state.values;
														localStorage.setItem(
															"checkout-form-draft",
															JSON.stringify({
																email: formValues.email || "",
																shipping: formValues.shipping || {},
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
					</div>
				</FormSection>
			)}

			{/* Affichage de l'email pour utilisateurs connectés */}
			{!isGuest && session?.user?.email && (
				<Alert>
					<Mail className="h-4 w-4" />
					<AlertDescription>
						Email de contact : <strong>{session.user.email}</strong>
					</AlertDescription>
				</Alert>
			)}

			{/* Message informatif pour guest checkout */}
			{isGuest && (
				<Alert>
					<Info className="h-4 w-4" />
					<AlertDescription>
						Tu peux commander sans créer de compte. Un email de confirmation
						te sera envoyé à l'adresse indiquée.
					</AlertDescription>
				</Alert>
			)}


			{/* SECTION 2 : Adresse de livraison */}
			<FormSection
				title="Adresse de livraison"
				description="Où souhaites-tu recevoir ta commande ?"
			>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Prénom */}
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

					{/* Nom */}
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

				{/* Adresse ligne 1 */}
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

				{/* Adresse ligne 2 (optionnel) */}
				<form.AppField name="shipping.addressLine2">
					{(field) => (
						<field.InputField
							label="Complément d'adresse"
							placeholder="Appartement, bâtiment, etc."
							autoComplete="address-line2"
						/>
					)}
				</form.AppField>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Code postal */}
					<form.AppField
						name="shipping.postalCode"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value) {
									return "Le code postal est requis";
								}
								// Validation basique - les codes postaux UE varient en format
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

					{/* Ville */}
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

				{/* Pays */}
				<form.AppField
					name="shipping.country"
					validators={{
						onChange: ({ value }: { value: string }) => {
							if (!value) {
								return "Le pays est requis";
							}
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

				{/* Téléphone */}
				<form.AppField
					name="shipping.phoneNumber"
					validators={{
						onChange: ({ value }: { value: string }) => {
							if (!value) {
								return "Le numéro de téléphone est requis";
							}
							// Regex pour numéros européens (livraison UE)
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

				{/* Message livraison UE uniquement */}
				<Alert>
					<Info className="h-4 w-4" />
					<AlertDescription>
						Livraison en France et Union Européenne uniquement
					</AlertDescription>
				</Alert>

				{/* Checkbox pour enregistrer l'adresse (utilisateurs connectés uniquement) */}
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

			{/* SECTION 2bis : Adresse de facturation (optionnel) */}
			<FormSection
				title="Adresse de facturation"
				description="Par défaut, identique à l'adresse de livraison"
			>
				<form.AppField name="billingDifferent">
					{(field) => (
						<div className="space-y-4">
							<field.CheckboxField label="Mon adresse de facturation est différente de l'adresse de livraison" />

							{/* Formulaire d'adresse de facturation conditionnel */}
							<form.Subscribe
								selector={(state) => [(state.values as any)?.billingDifferent]}
							>
								{([billingDifferent]) => (
									<AnimatePresence>
										{billingDifferent && (
											<motion.div
												initial={{ opacity: 0, height: 0 }}
												animate={{ opacity: 1, height: "auto" }}
												exit={{ opacity: 0, height: 0 }}
												transition={{ duration: 0.2 }}
												className="space-y-6 p-4 border rounded-lg bg-muted/30 overflow-hidden"
											>
											<Alert>
												<Info className="h-4 w-4" />
												<AlertDescription>
													Cette adresse sera utilisée pour ta facture.
													L'adresse de livraison restera inchangée.
												</AlertDescription>
											</Alert>

											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												{/* Prénom facturation */}
												<form.AppField
													name="billing.firstName"
													validators={{
														onChange: ({ value }: { value: string }) => {
															const billingDiff = (form.state.values as any)
																?.billingDifferent;
															if (
																billingDiff &&
																(!value || value.trim().length < 2)
															) {
																return "Le prénom doit contenir au moins 2 caractères";
															}
														},
													}}
												>
													{(billingField) => (
														<billingField.InputField
															label="Prénom"
															required
															autoComplete="billing given-name"
														/>
													)}
												</form.AppField>

												{/* Nom facturation */}
												<form.AppField
													name="billing.lastName"
													validators={{
														onChange: ({ value }: { value: string }) => {
															const billingDiff = (form.state.values as any)
																?.billingDifferent;
															if (
																billingDiff &&
																(!value || value.trim().length < 2)
															) {
																return "Le nom doit contenir au moins 2 caractères";
															}
														},
													}}
												>
													{(billingField) => (
														<billingField.InputField
															label="Nom"
															required
															autoComplete="billing family-name"
														/>
													)}
												</form.AppField>
											</div>

											{/* Adresse facturation */}
											<form.AppField
												name="billing.addressLine1"
												validators={{
													onChange: ({ value }: { value: string }) => {
														const billingDiff = (form.state.values as any)
															?.billingDifferent;
														if (
															billingDiff &&
															(!value || value.trim().length < 5)
														) {
															return "L'adresse doit contenir au moins 5 caractères";
														}
													},
												}}
											>
												{(billingField) => (
													<billingField.InputField
														label="Adresse"
														required
														autoComplete="billing address-line1"
													/>
												)}
											</form.AppField>

											{/* Complément adresse facturation */}
											<form.AppField name="billing.addressLine2">
												{(billingField) => (
													<billingField.InputField
														label="Complément d'adresse"
														placeholder="Appartement, bâtiment, etc."
														autoComplete="billing address-line2"
													/>
												)}
											</form.AppField>

											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												{/* Code postal facturation */}
												<form.AppField
													name="billing.postalCode"
													validators={{
														onChange: ({ value }: { value: string }) => {
															const billingDiff = (form.state.values as any)
																?.billingDifferent;
															if (billingDiff) {
																if (!value) {
																	return "Le code postal est requis";
																}
															}
														},
													}}
												>
													{(billingField) => (
														<billingField.InputField
															label="Code postal"
															required
															autoComplete="billing postal-code"
														/>
													)}
												</form.AppField>

												{/* Ville facturation */}
												<form.AppField
													name="billing.city"
													validators={{
														onChange: ({ value }: { value: string }) => {
															const billingDiff = (form.state.values as any)
																?.billingDifferent;
															if (
																billingDiff &&
																(!value || value.trim().length < 2)
															) {
																return "La ville est requise";
															}
														},
													}}
												>
													{(billingField) => (
														<billingField.InputField
															label="Ville"
															required
															autoComplete="billing address-level2"
														/>
													)}
												</form.AppField>
											</div>

											{/* Pays facturation */}
											<form.AppField
												name="billing.country"
												validators={{
													onChange: ({ value }: { value: string }) => {
														const billingDiff = (form.state.values as any)
															?.billingDifferent;
														if (billingDiff && !value) {
															return "Le pays est requis";
														}
													},
												}}
											>
												{(billingField) => (
													<billingField.SelectField
														label="Pays"
														required
														placeholder="Sélectionner un pays"
														options={countryOptions}
													/>
												)}
											</form.AppField>

											{/* Téléphone facturation */}
											<form.AppField
												name="billing.phoneNumber"
												validators={{
													onChange: ({ value }: { value: string }) => {
														const billingDiff = (form.state.values as any)
															?.billingDifferent;
														if (billingDiff && value) {
															const cleaned = value.replace(/[\s.\-()]/g, "");
															if (
																!/^(?:\+|00)?[1-9]\d{8,14}$/.test(cleaned)
															) {
																return "Numéro de téléphone invalide";
															}
														}
													},
												}}
											>
												{(billingField) => (
													<billingField.InputField
														label="Téléphone (optionnel)"
														type="tel"
														placeholder="06 12 34 56 78"
														autoComplete="billing tel"
													/>
												)}
											</form.AppField>
											</motion.div>
										)}
									</AnimatePresence>
								)}
							</form.Subscribe>
						</div>
					)}
				</form.AppField>
			</FormSection>

			{/* SECTION 2ter : Information légale droit de rétractation */}
			<Alert>
				<Info className="h-4 w-4" />
				<AlertTitle>
					Droit de rétractation
				</AlertTitle>
				<AlertDescription>
					Conformément à la législation française, tu disposes d'un délai de{" "}
					<strong>14 jours</strong> à compter de la réception de ta commande
					pour exercer ton droit de rétractation sans avoir à justifier de
					motifs ni à payer de pénalités.{" "}
					<Link
						href="/legal/terms"
						className="underline hover:no-underline font-medium"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="En savoir plus sur les conditions de retour (ouvre dans un nouvel onglet)"
					>
						En savoir plus sur les conditions de retour
					</Link>
				</AlertDescription>
			</Alert>

			{/* SECTION 3 : Consentements */}
			<FormSection
				title="Conditions et consentements"
				description="Informations légales"
			>
				{/* CGV */}
				<form.AppField
					name="termsAccepted"
					validators={{
						onChange: ({ value }: { value: boolean }) => {
							if (!value) {
								return "Tu dois accepter les conditions générales de vente pour continuer";
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
							<p className="text-xs/5 tracking-normal antialiased text-muted-foreground ml-8">
								Consultez nos{" "}
								<Link
									href="/legal/terms"
									className="text-foreground underline hover:no-underline"
									target="_blank"
									rel="noopener noreferrer"
									aria-label="Conditions générales de vente (ouvre dans un nouvel onglet)"
								>
									conditions générales de vente
								</Link>
							</p>
						</div>
					)}
				</form.AppField>

				{/* Newsletter */}
				<form.AppField name="newsletter">
					{(field) => (
						<div className="space-y-2">
							<field.CheckboxField label="Je souhaite recevoir les actualités et offres spéciales par email" />
						</div>
					)}
				</form.AppField>
			</FormSection>

			{/* Footer avec bouton de paiement */}
			<div className="mt-6">
				<div className="space-y-4">
					{/* Message sécurité */}
					<div className="p-4 bg-muted/50 rounded-lg border space-y-3">
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

					{/* Bouton de paiement */}
					<Button
						type="submit"
						size="lg"
						className="w-full text-base h-14 relative overflow-hidden group"
					>
						<CreditCard className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
						Commander avec obligation de paiement · {formatEuro(total)}
						<span className="absolute inset-0 bg-linear-to-r from-accent/0 via-accent/20 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
					</Button>

					{/* Message de réassurance */}
					<p className="text-xs text-center text-muted-foreground">
						En cliquant sur le bouton, tu seras redirigé vers une page de
						paiement sécurisée Stripe
					</p>

					{/* Contact SAV */}
					<div className="mt-6 p-4 bg-muted/30 rounded-lg border text-center space-y-2">
						<p className="text-sm font-medium">
							Besoin d'aide pour finaliser ta commande ?
						</p>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-muted-foreground">
							<a
								href="mailto:contact@synclune.fr"
								className="flex items-center gap-2 hover:text-foreground transition-colors"
							>
								<Mail className="w-4 h-4" />
								<span>contact@synclune.fr</span>
							</a>
							<span className="hidden sm:inline">•</span>
							<span className="text-xs">Réponse sous 24h</span>
						</div>
					</div>
				</div>
			</div>
		</form>
	);
}
