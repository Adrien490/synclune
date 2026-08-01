"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import type { Session } from "@/modules/auth/lib/auth";
import { CheckoutSection } from "./checkout-section";
import type { CheckoutFormInstance } from "../hooks/use-checkout-form";
import { logout } from "@/modules/auth/actions/logout";
import { toast } from "@/shared/utils/toast";
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
	// Changer de compte déconnecte, quitte /paiement et perd TOUT le formulaire déjà
	// saisi (adresse comprise) : c'est destructif, donc confirmation préalable —
	// `ResponsiveAlertDialog` est la primitive imposée pour ce cas (cf. CLAUDE.md).
	// Dialogue local plutôt que via le store : un seul call site, aucun besoin de
	// piloter l'ouverture à distance.
	const [isSwitchConfirmOpen, setIsSwitchConfirmOpen] = useState(false);

	const handleSwitchAccount = () => {
		setIsSwitchConfirmOpen(false);
		startLogoutTransition(async () => {
			try {
				await logout();
			} catch {
				toast.error("Impossible de te déconnecter. Réessaye dans un instant.");
				return;
			}
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
							onDynamic: ({ value }: { value: string }) => {
								if (!value) return "L'adresse email est requise";
								if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
									return "Entre une adresse email valide";
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
										Tu as déjà un compte ?{" "}
										<Link
											href="/connexion?callbackURL=/paiement"
											className="text-foreground font-medium underline hover:no-underline"
										>
											Connecte-toi
										</Link>{" "}
										pour retrouver tes commandes et leur suivi
									</span>
								</div>
							</div>
						)}
					</form.AppField>
				)}

				{/* Email display for logged-in users */}
				{!isGuest && session.user.email && (
					<div className="border-primary/10 bg-primary/5 flex flex-wrap items-center gap-2 rounded-xl border p-3.5 text-sm">
						<Mail className="text-muted-foreground size-4 shrink-0" />
						<span className="text-muted-foreground">Email :</span>
						<span className="font-medium">{session.user.email}</span>
						<button
							type="button"
							onClick={() => setIsSwitchConfirmOpen(true)}
							disabled={isLogoutPending}
							className="text-muted-foreground hover:text-foreground focus-visible:ring-ring ml-auto rounded-sm text-xs underline hover:no-underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
							aria-busy={isLogoutPending}
						>
							{isLogoutPending ? "Déconnexion…" : "Ce n'est pas moi"}
						</button>
					</div>
				)}

				<ResponsiveAlertDialog
					open={isSwitchConfirmOpen}
					onOpenChange={setIsSwitchConfirmOpen}
					tone="destructive"
				>
					<ResponsiveAlertDialogContent>
						<ResponsiveAlertDialogHeader>
							<ResponsiveAlertDialogTitle>Changer de compte ?</ResponsiveAlertDialogTitle>
							<ResponsiveAlertDialogDescription>
								Tu vas être déconnecté·e et redirigé·e vers la page de connexion. Les informations
								déjà saisies dans ce formulaire seront perdues.
							</ResponsiveAlertDialogDescription>
						</ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogFooter>
							<ResponsiveAlertDialogCancel>Rester connecté·e</ResponsiveAlertDialogCancel>
							<ResponsiveAlertDialogAction onClick={handleSwitchAccount}>
								Changer de compte
							</ResponsiveAlertDialogAction>
						</ResponsiveAlertDialogFooter>
					</ResponsiveAlertDialogContent>
				</ResponsiveAlertDialog>
			</div>
		</CheckoutSection>
	);
}
