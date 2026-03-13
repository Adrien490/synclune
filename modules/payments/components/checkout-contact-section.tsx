"use client";

import type { Session } from "@/modules/auth/lib/auth";
import { CheckoutSection } from "./checkout-section";
import type { CheckoutFormInstance } from "../hooks/use-checkout-form";
import { Info, Mail, Newspaper } from "lucide-react";
import Link from "next/link";

interface CheckoutContactSectionProps {
	form: CheckoutFormInstance;
	session: Session | null;
}

export function CheckoutContactSection({ form, session }: CheckoutContactSectionProps) {
	const isGuest = !session;

	return (
		<CheckoutSection title="Contact">
			<div className="space-y-5">
				{/* Email (guests only) */}
				{isGuest && (
					<form.AppField
						name="email"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value) return "L'adresse email est requise";
								if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
									return "Entrez une adresse email valide";
								}
								return undefined;
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
								/>
								<div className="text-muted-foreground flex items-start gap-1.5 text-sm">
									<Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
									<span>
										Vous avez déjà un compte ?{" "}
										<Link
											href="/connexion?callbackURL=/paiement"
											className="text-foreground font-medium underline hover:no-underline"
										>
											Connectez-vous
										</Link>{" "}
										pour accéder à vos adresses enregistrées
									</span>
								</div>
							</div>
						)}
					</form.AppField>
				)}

				{/* Email display for logged-in users */}
				{!isGuest && session.user.email && (
					<div className="border-primary/10 bg-primary/3 flex items-center gap-2 rounded-xl border p-3.5 text-sm">
						<Mail className="text-muted-foreground h-4 w-4" />
						<span className="text-muted-foreground">Email :</span>
						<span className="font-medium">{session.user.email}</span>
					</div>
				)}
				{/* Newsletter opt-in */}
				<form.AppField name="newsletterOptIn">
					{(field) => (
						<div className="border-primary/10 bg-primary/3 flex items-start gap-3 rounded-xl border p-3.5">
							<field.CheckboxField
								label={
									<span className="text-sm">
										Je souhaite recevoir les nouveautés et offres exclusives Synclune
									</span>
								}
							/>
						</div>
					)}
				</form.AppField>
			</div>
		</CheckoutSection>
	);
}
