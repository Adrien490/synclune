import { Spinner } from "@/shared/components/ui/spinner";
import { Lock } from "lucide-react";

/**
 * État de chargement pendant la vérification du paiement.
 * Affiché pendant la requête `stripe.paymentIntents.retrieve` (1-3 s sur réseau lent).
 * Texte rassurant + indication "ne fermez pas" pour réduire l'anxiété post-paiement.
 */
export default function CheckoutReturnLoading() {
	return (
		<div
			role="status"
			aria-live="polite"
			aria-busy="true"
			className="flex min-h-screen items-center justify-center px-4"
		>
			<div className="max-w-sm space-y-5 text-center">
				<Spinner className="mx-auto size-10" />
				<div className="space-y-2">
					<p className="text-foreground text-base font-medium">
						Vérification de votre paiement
						<span aria-hidden="true" className="motion-safe:animate-pulse">
							…
						</span>
					</p>
					<p className="text-muted-foreground text-sm">
						Merci de ne pas fermer cette page. Cela ne prend que quelques secondes.
					</p>
				</div>
				<p className="text-muted-foreground inline-flex items-center justify-center gap-1.5 text-xs">
					<Lock className="size-3" aria-hidden="true" />
					Connexion sécurisée par Stripe
				</p>
			</div>
		</div>
	);
}
