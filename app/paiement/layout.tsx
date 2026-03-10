import { CartAndSkuWrapper } from "@/modules/cart/components/cart-and-sku-wrapper";
import { Logo } from "@/shared/components/logo";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * Layout minimaliste pour le checkout
 *
 * Inspiré des best practices checkout 2026 :
 * - Retour boutique à gauche
 * - Logo à droite (comme auth, sans texte)
 * - Pas de navbar complète (évite les distractions)
 * - Pas de footer (focus sur la conversion)
 */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="bg-background flex min-h-screen flex-col">
			{/* Header minimal */}
			<header className="bg-background/90 border-primary/10 border-b-0 backdrop-blur-md md:border-b">
				{/* Decorative top line */}
				<div className="from-primary/0 via-primary/40 to-primary/0 h-px bg-linear-to-r" />

				<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
					<div className="relative flex h-16 items-center">
						{/* Back link - left */}
						<Link
							href="/produits"
							aria-label="Continuer mes achats"
							className="group text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm transition-colors sm:px-3"
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
