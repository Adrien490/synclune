"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@/modules/auth/lib/auth";
import { CheckoutSection } from "./checkout-section";
import type { CheckoutFormInstance } from "../hooks/use-checkout-form";
import { logout } from "@/modules/auth/actions/logout";
import { Info, Mail } from "lucide-react";
import Link from "next/link";

interface CheckoutContactSectionProps {
	form: CheckoutFormInstance;
	session: Session | null;
}

export function CheckoutContactSection({ form, session }: CheckoutContactSectionProps) {
	const isGuest = !session;
	const router = useRouter();
	const [isLogoutPending, startLogoutTransition] = useTransition();

	const handleSwitchAccount = () => {
		startLogoutTransition(async () => {
			await logout();
			router.push("/connexion?callbackURL=/paiement");
			router.refresh();
		});
	};

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
									<Info className="mt-0.5 size-3.5 shrink-0" />
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
					<div className="border-primary/10 bg-primary/3 flex flex-wrap items-center gap-2 rounded-xl border p-3.5 text-sm">
						<Mail className="text-muted-foreground size-4 shrink-0" />
						<span className="text-muted-foreground">Email :</span>
						<span className="font-medium">{session.user.email}</span>
						<button
							type="button"
							onClick={handleSwitchAccount}
							disabled={isLogoutPending}
							className="text-muted-foreground hover:text-foreground focus-visible:ring-ring ml-auto rounded-sm text-xs underline hover:no-underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
							aria-busy={isLogoutPending}
						>
							{isLogoutPending ? "Déconnexion…" : "Ce n'est pas moi"}
						</button>
					</div>
				)}
			</div>
		</CheckoutSection>
	);
}
