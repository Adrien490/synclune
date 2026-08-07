import { CookieBannerLazy } from "@/shared/components/cookie-banner-lazy";
import { Logo } from "@/shared/components/logo";

/**
 * Layout du suivi de commande invité (AUDIT-BIZ-001).
 *
 * Volontairement autonome — PAS dans le groupe `(shop)` ni `(account)` :
 *  - `(shop)/layout.tsx` remplace tout le contenu par `StoreClosurePage` quand
 *    `StoreSettings.isClosed` : un client qui suit une commande déjà payée ne
 *    doit pas perdre l'accès parce que la boutique est fermée ;
 *  - `(account)` implique une session, ce que l'invité n'a pas par définition.
 *
 * Header minimal (logo seulement) : la page est atteinte depuis un email, pas
 * depuis la navigation — pas de navbar ni de panier à afficher.
 */
export default function OrderTrackingLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="bg-background flex min-h-dvh flex-col">
			{/*
			 * Pas de lien d'évitement ici : `<SkipLink />` est monté à la RACINE
			 * (`app/layout.tsx`) et couvre déjà cette route. Deux liens vers le même
			 * `#main-content` se suivaient dans l'ordre de tabulation.
			 */}

			<div
				aria-hidden="true"
				className="from-primary/5 to-secondary/5 fixed inset-0 -z-10 bg-linear-to-br via-transparent"
			/>

			<header className="bg-background/90 border-primary/10 border-b backdrop-blur-md">
				<div className="pt-[env(safe-area-inset-top)]">
					<div className="from-primary/0 via-primary/40 to-primary/0 h-px bg-linear-to-r" />
					<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
						<div className="flex h-16 items-center">
							<Logo href="/" size={28} sizeMd={36} />
						</div>
					</div>
				</div>
			</header>

			<main id="main-content" tabIndex={-1} className="flex-1">
				{children}
			</main>

			{/* Porte d'entrée DIRECTE (lien email de confirmation) : sans la bannière
			    ici, un invité qui n'est jamais passé par la boutique n'a aucune
			    occasion de consentir ou refuser (audit cookie-banner 2026-08-03). */}
			<CookieBannerLazy />
		</div>
	);
}
