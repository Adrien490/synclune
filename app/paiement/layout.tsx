import { isAdmin } from "@/modules/auth/utils/guards";
import { CartAndSkuWrapper } from "@/modules/cart/components/cart-and-sku-wrapper";
import { getStoreStatus } from "@/modules/store-settings/data/get-store-status";
import { Logo } from "@/shared/components/logo";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

/**
 * Layout minimaliste pour le checkout
 *
 * Inspiré des best practices checkout 2026 :
 * - Retour boutique à gauche
 * - Logo à droite (comme auth, sans texte)
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
		<div className="bg-background flex min-h-screen flex-col">
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
			<header className="bg-background/90 border-primary/10 border-b-0 pt-[env(safe-area-inset-top)] backdrop-blur-md md:border-b">
				{/* Decorative top line */}
				<div className="from-primary/0 via-primary/40 to-primary/0 h-px bg-linear-to-r" />

				<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
					<div className="relative flex h-16 items-center">
						{/* Back link - left */}
						<Link
							href="/produits"
							aria-label="Boutique"
							className="group text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex items-center gap-1.5 rounded-lg p-2 text-sm transition-colors sm:px-3"
						>
							<ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
							<span className="hidden sm:inline">Boutique</span>
						</Link>

						{/* Logo - right */}
						<div className="ml-auto">
							<div className="md:hidden">
								<Logo href="/" size={28} />
							</div>
							<div className="hidden md:block">
								<Logo href="/" size={36} />
							</div>
						</div>
					</div>
				</div>
			</header>

			<CartAndSkuWrapper />

			{/* Contenu */}
			<main id="main-content" tabIndex={-1} className="flex-1">
				{children}
			</main>
		</div>
	);
}
