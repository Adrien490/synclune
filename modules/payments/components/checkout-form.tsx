"use client";

import { FormLayout, FormSection } from "@/shared/components/forms";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import type { Session } from "@/modules/auth/lib/auth";
import { calculateShipping } from "@/modules/orders/utils/shipping.utils";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { formatEuro } from "@/shared/utils/format-euro";
import { CreditCard, Info, Mail, MapPin, Receipt, Shield } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
	SORTED_SHIPPING_COUNTRIES,
	COUNTRY_NAMES,
} from "@/shared/constants/countries";
import {
	WizardProvider,
	useWizardContext,
	useFormWizard,
	useUnsavedChanges,
	WizardStepContainer,
	WizardMobileShell,
	createTanStackFormAdapter,
	type WizardStep,
} from "@/shared/features/form-wizard";
import Link from "next/link";
import { useCheckoutForm } from "../hooks/use-checkout-form";

// Options pour le select des pays
const countryOptions = SORTED_SHIPPING_COUNTRIES.map((code) => ({
	value: code,
	label: COUNTRY_NAMES[code],
}));

// Étapes du wizard checkout
// Note: l'étape email utilise `condition` pour n'apparaître que pour les guests
const getCheckoutSteps = (isGuest: boolean): WizardStep[] => [
	{
		id: "email",
		label: "Contact",
		description: "Ton adresse email",
		icon: <Mail className="size-4" />,
		fields: ["email"],
		condition: () => isGuest,
	},
	{
		id: "shipping",
		label: "Livraison",
		description: "Adresse de livraison",
		icon: <MapPin className="size-4" />,
		fields: [
			"shipping.firstName",
			"shipping.lastName",
			"shipping.addressLine1",
			"shipping.postalCode",
			"shipping.city",
			"shipping.country",
			"shipping.phoneNumber",
		],
	},
	{
		id: "billing",
		label: "Facturation",
		description: "Adresse de facturation",
		icon: <Receipt className="size-4" />,
		fields: [
			"billingDifferent",
			"billing.firstName",
			"billing.lastName",
			"billing.addressLine1",
			"billing.postalCode",
			"billing.city",
			"billing.country",
		],
		optional: true,
	},
	{
		id: "payment",
		label: "Paiement",
		description: "Finaliser la commande",
		icon: <CreditCard className="size-4" />,
		fields: ["termsAccepted"],
	},
];

interface CheckoutFormProps {
	cart: NonNullable<GetCartReturn>;
	session: Session | null;
	addresses: GetUserAddressesReturn | null;
}

/**
 * Formulaire de checkout avec wizard multi-étapes
 * - Mobile : navigation étape par étape avec swipe
 * - Desktop : toutes les sections visibles en 2 colonnes
 */
export function CheckoutForm({
	cart,
	session,
	addresses,
}: CheckoutFormProps) {
	const isGuest = !session;
	const steps = getCheckoutSteps(isGuest);

	return (
		<WizardProvider totalSteps={steps.length} desktopMode="all">
			<CheckoutFormContent
				cart={cart}
				session={session}
				addresses={addresses}
				isGuest={isGuest}
				steps={steps}
			/>
		</WizardProvider>
	);
}

interface CheckoutFormContentProps extends CheckoutFormProps {
	isGuest: boolean;
	steps: WizardStep[];
}

function CheckoutFormContent({
	cart,
	session,
	addresses,
	isGuest,
	steps,
}: CheckoutFormContentProps) {
	// Get context first (needed for conditional logic)
	const { isMobile } = useWizardContext();

	// Form hook
	const { form, action, isPending } = useCheckoutForm({ session, addresses });

	// Wizard hook with form adapter
	const wizard = useFormWizard({
		steps,
		form: createTanStackFormAdapter(form),
		persist: "checkout-wizard",
		messages: {
			navigation: {
				submit: "Payer",
			},
		},
	});

	// Warn user about unsaved changes before leaving
	useUnsavedChanges(form.state.isDirty && !isPending);

	// Calculer le total
	const subtotal = cart.items.reduce((sum, item) => {
		return sum + item.priceAtAdd * item.quantity;
	}, 0);
	const shipping = calculateShipping();
	const total = subtotal + shipping;

	// Rendu du contenu de chaque étape par index
	const renderStepContent = (stepIndex: number) => {
		const step = wizard.visibleSteps[stepIndex];
		if (!step) return null;

		switch (step.id) {
			case "email":
				return (
					<FormSection
						title="Ton email"
						description="Pour recevoir la confirmation"
						icon={<Mail />}
						hideHeader={wizard.effectiveMode === "wizard"}
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
											placeholder="sophie.martin@exemple.fr"
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
				);

			case "shipping":
				return (
					<FormSection
						title="Adresse de livraison"
						description="Où souhaites-tu recevoir ta commande ?"
						icon={<MapPin />}
						hideHeader={wizard.effectiveMode === "wizard"}
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
								<field.InputField
									label="Complément d'adresse"
									placeholder="Appartement, bâtiment, etc."
									autoComplete="address-line2"
								/>
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
				);

			case "billing":
				return (
					<FormSection
						title="Adresse de facturation"
						description="Par défaut, identique à l'adresse de livraison"
						icon={<Receipt />}
						hideHeader={wizard.effectiveMode === "wizard"}
					>
						<form.AppField name="billingDifferent">
							{(field) => (
								<div className="space-y-4">
									<field.CheckboxField label="Mon adresse de facturation est différente de l'adresse de livraison" />

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
															<form.AppField
																name="billing.firstName"
																validators={{
																	onChange: ({ value }: { value: string }) => {
																		const billingDiff = (form.state.values as any)?.billingDifferent;
																		if (billingDiff && (!value || value.trim().length < 2)) {
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

															<form.AppField
																name="billing.lastName"
																validators={{
																	onChange: ({ value }: { value: string }) => {
																		const billingDiff = (form.state.values as any)?.billingDifferent;
																		if (billingDiff && (!value || value.trim().length < 2)) {
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

														<form.AppField
															name="billing.addressLine1"
															validators={{
																onChange: ({ value }: { value: string }) => {
																	const billingDiff = (form.state.values as any)?.billingDifferent;
																	if (billingDiff && (!value || value.trim().length < 5)) {
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
															<form.AppField
																name="billing.postalCode"
																validators={{
																	onChange: ({ value }: { value: string }) => {
																		const billingDiff = (form.state.values as any)?.billingDifferent;
																		if (billingDiff && !value) {
																			return "Le code postal est requis";
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

															<form.AppField
																name="billing.city"
																validators={{
																	onChange: ({ value }: { value: string }) => {
																		const billingDiff = (form.state.values as any)?.billingDifferent;
																		if (billingDiff && (!value || value.trim().length < 2)) {
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

														<form.AppField
															name="billing.country"
															validators={{
																onChange: ({ value }: { value: string }) => {
																	const billingDiff = (form.state.values as any)?.billingDifferent;
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

														<form.AppField
															name="billing.phoneNumber"
															validators={{
																onChange: ({ value }: { value: string }) => {
																	const billingDiff = (form.state.values as any)?.billingDifferent;
																	if (billingDiff && value) {
																		const cleaned = value.replace(/[\s.\-()]/g, "");
																		if (!/^(?:\+|00)?[1-9]\d{8,14}$/.test(cleaned)) {
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
				);

			case "payment":
				return (
					<FormSection
						title="Conditions et paiement"
						description="Finaliser ta commande"
						icon={<Shield />}
						hideHeader={wizard.effectiveMode === "wizard"}
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

						{/* Newsletter */}
						<form.AppField name="newsletter">
							{(field) => (
								<field.CheckboxField label="Je souhaite recevoir les actualités et offres spéciales par email" />
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
				);

			default:
				return null;
		}
	};

	// Champs cachés
	const renderHiddenFields = () => (
		<>
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
					const v = values as any;
					return (
						<>
							<input
								type="hidden"
								name="shippingAddress"
								value={JSON.stringify({
									firstName: v?.shipping?.firstName || "",
									lastName: v?.shipping?.lastName || "",
									addressLine1: v?.shipping?.addressLine1 || "",
									addressLine2: v?.shipping?.addressLine2 || "",
									city: v?.shipping?.city || "",
									postalCode: v?.shipping?.postalCode || "",
									country: v?.shipping?.country || "FR",
									phoneNumber: v?.shipping?.phoneNumber || "",
								})}
							/>
							{v?.billingDifferent && (
								<input
									type="hidden"
									name="billingAddress"
									value={JSON.stringify({
										firstName: v?.billing?.firstName || "",
										lastName: v?.billing?.lastName || "",
										addressLine1: v?.billing?.addressLine1 || "",
										addressLine2: v?.billing?.addressLine2 || "",
										city: v?.billing?.city || "",
										postalCode: v?.billing?.postalCode || "",
										country: v?.billing?.country || "FR",
										phoneNumber: v?.billing?.phoneNumber || "",
									})}
								/>
							)}
							{isGuest && <input type="hidden" name="email" value={v?.email || ""} />}
							<input type="hidden" name="newsletter" value={v?.newsletter ? "true" : "false"} />
							{!isGuest && <input type="hidden" name="saveAddress" value={v?.saveAddress ? "true" : "false"} />}
						</>
					);
				}}
			</form.Subscribe>
		</>
	);

	// Bouton de paiement
	const renderPaymentButton = (className?: string) => (
		<Button
			type="submit"
			size="lg"
			className={className ?? "w-full text-base h-14 relative overflow-hidden group"}
			disabled={isPending}
		>
			<CreditCard className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
			{isPending ? "Redirection..." : `Commander · ${formatEuro(total)}`}
			<span className="absolute inset-0 bg-linear-to-r from-accent/0 via-accent/20 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
		</Button>
	);

	// Footer desktop
	const renderFooter = () => (
		<div className="space-y-4">
			{renderPaymentButton()}
			<p className="text-xs text-center text-muted-foreground">
				Tu seras redirigé vers Stripe pour finaliser le paiement
			</p>
			<div className="p-4 bg-muted/30 rounded-lg border text-center space-y-2">
				<p className="text-sm font-medium">Besoin d'aide ?</p>
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
	);

	// Mode mobile : wizard avec navigation
	if (wizard.effectiveMode === "wizard") {
		return (
			<form
				action={action}
				className="space-y-6"
				onSubmit={() => void form.handleSubmit()}
			>
				{renderHiddenFields()}

				<form.AppForm>
					<form.FormErrorDisplay />
				</form.AppForm>

				<WizardMobileShell
					steps={wizard.visibleSteps}
					currentStep={wizard.currentStep}
					completedSteps={wizard.completedSteps}
					onStepClick={wizard.goToStep}
					isFirstStep={wizard.isFirstStep}
					isLastStep={wizard.isLastStep}
					onPrevious={wizard.goPrevious}
					onNext={wizard.goNext}
					isSubmitting={isPending}
					isValidating={wizard.isValidating}
					getStepErrors={wizard.getStepErrors}
					title="Paiement"
					renderLastStepFooter={() => (
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<Button
									type="button"
									variant="outline"
									onClick={wizard.goPrevious}
									disabled={isPending}
									className="flex-1 h-12"
								>
									Précédent
								</Button>
								{renderPaymentButton("flex-1 h-12 text-sm")}
							</div>
							<p className="text-xs text-center text-muted-foreground">
								Tu seras redirigé vers Stripe
							</p>
						</div>
					)}
				>
					{wizard.visibleSteps.map((step, index) => (
						<WizardStepContainer key={step.id} step={step} stepIndex={index}>
							{renderStepContent(index)}
						</WizardStepContainer>
					))}
				</WizardMobileShell>
			</form>
		);
	}

	// Mode desktop : layout 2 colonnes pour livraison + facturation
	return (
		<form
			action={action}
			className="space-y-6 pb-32"
			onSubmit={() => void form.handleSubmit()}
		>
			{renderHiddenFields()}

			<form.AppForm>
				<form.FormErrorDisplay />
			</form.AppForm>

			<RequiredFieldsNote />

			{/* Email (guests only) */}
			{isGuest && renderStepContent(0)}

			{/* Livraison + Facturation en 2 colonnes */}
			<FormLayout cols={2}>
				{renderStepContent(isGuest ? 1 : 0)}
				{renderStepContent(isGuest ? 2 : 1)}
			</FormLayout>

			{/* Paiement */}
			{renderStepContent(isGuest ? 3 : 2)}

			{renderFooter()}
		</form>
	);
}
