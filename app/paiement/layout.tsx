import { isAdmin } from "@/modules/auth/utils/guards";
import { getStoreStatus } from "@/modules/store-settings/data/get-store-status";
import { Logo } from "@/shared/components/logo";
import { redirect } from "next/navigation";
import { CheckoutBackLink } from "./_components/checkout-back-link";
import { CheckoutTrustBadge } from "./_components/checkout-trust-badge";

/**
 * Layout minimaliste pour le checkout
 *
 * Inspiré des best practices checkout 2026 :
 * - Retour boutique à gauche (haptic + view-transition)
 * - Badge "Paiement sécurisé · Stripe" centré (trust signal Baymard)
 * - Logo à droite (responsive 28→36px sans dual-render)
 * - Pas de navbar complète (évite les distractions)
 * - Pas de footer (focus sur la conversion)
 */
export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
	const storeStatus = await getStoreStatus();

	if (storeStatus.isClosed) {
		const admin = await isAdmin();
		if (!admin) {
			redirect("/");
		}
	}

	return (
		<div className="bg-background flex min-h-dvh min-h-screen flex-col">
			{/* Preconnect to Stripe — only needed on checkout pages */}
			<link rel="dns-prefetch" href="https://js.stripe.com" />
			<link rel="preconnect" href="https://js.stripe.com" crossOrigin="anonymous" />

			{/* Skip to main content (WCAG 2.4.1) */}
			<a
				href="#main-content"
				className="bg-background text-foreground border-primary focus-visible:ring-ring sr-only z-50 rounded-md border px-4 py-2 text-sm font-medium shadow-md focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
			>
				Aller au contenu
			</a>

			{/* Header minimal */}
			<header
				className="bg-background/90 border-primary/10 border-b-0 backdrop-blur-md md:border-b"
				style={{ viewTransitionName: "shop-paiement-header" }}
			>
				{/* Safe-area cushion preserves notch on iPhone landscape (background extends behind statusbar) */}
				<div className="pt-[env(safe-area-inset-top)]">
					{/* Decorative top line */}
					<div className="from-primary/0 via-primary/40 to-primary/0 h-px bg-linear-to-r" />

					<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
						<div className="relative flex h-16 items-center">
							{/* Back link - left */}
							<CheckoutBackLink />

							{/* Trust badge - center (sm+ only) */}
							<CheckoutTrustBadge />

							{/* Logo - right (single render, responsive 28→36px) */}
							<div className="ml-auto" style={{ viewTransitionName: "shop-logo-paiement" }}>
								<Logo href="/" size={28} sizeMd={36} />
							</div>
						</div>
					</div>
				</div>
			</header>

			{/* Contenu */}
			<main id="main-content" tabIndex={-1} className="flex-1">
				{children}
			</main>
		</div>
	);
}
