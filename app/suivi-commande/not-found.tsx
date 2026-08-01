import { NotFoundContent } from "@/app/_components/not-found-content";
import { NotFoundShell } from "@/app/_components/not-found-shell";
import { Button } from "@/shared/components/ui/button";
import { BRAND } from "@/shared/constants/brand";
import { ROUTES } from "@/shared/constants/urls";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Lien de suivi invalide - Synclune",
	robots: { index: false, follow: false },
};

/**
 * 404 du suivi de commande invité.
 *
 * ⚠️ Copie volontairement **indistincte**. `page.tsx` appelle `notFound()` pour
 * trois causes distinctes — paramètres invalides, commande inexistante ou
 * supprimée, token HMAC invalide — précisément pour ne pas offrir d'oracle
 * d'existence de commande (cf. « Fail-closed indistinct » dans `page.tsx`).
 * Ne jamais différencier ces cas dans le texte : « cette commande n'existe pas »
 * confirmerait a contrario l'existence des autres.
 *
 * `variant="inset"` : `layout.tsx` fournit déjà le `<main>` et le fond.
 *
 * Pas de CTA vers `/commandes` — la page existe pour les invités sans compte.
 */
export default function OrderTrackingNotFound() {
	return (
		<NotFoundShell errorCode="404" variant="inset">
			<NotFoundContent
				emoji={
					<p className="text-8xl" aria-hidden="true">
						🔗
					</p>
				}
				title={
					<h1 className="font-display text-foreground text-3xl font-normal md:text-4xl">
						Ce lien de suivi n&apos;est plus valide
					</h1>
				}
				description={
					<p className="text-muted-foreground text-lg md:text-xl">
						Le lien est peut-être incomplet ou a expiré. Le plus sûr est de rouvrir celui de ton
						email de confirmation de commande.
					</p>
				}
				actions={
					<div className="space-y-4">
						<div className="flex flex-col justify-center gap-4 sm:flex-row">
							<Button asChild size="lg">
								<Link href={ROUTES.SHOP.HOME}>Retour à l&apos;accueil</Link>
							</Button>
							<Button asChild variant="secondary" size="lg">
								<Link href={`mailto:${BRAND.contact.email}`}>M&apos;écrire</Link>
							</Button>
						</div>
					</div>
				}
			/>
		</NotFoundShell>
	);
}
