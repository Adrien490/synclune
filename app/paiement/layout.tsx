import { Logo } from "@/shared/components/logo";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";

/**
 * Layout minimaliste pour le checkout
 *
 * Inspiré des best practices checkout 2026 :
 * - Header minimal avec logo et retour panier
 * - Pas de navbar complète (évite les distractions)
 * - Pas de footer (focus sur la conversion)
 * - Beaucoup d'espace blanc
 */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="bg-background flex min-h-screen flex-col">
			{/* Header minimal */}
			<header className="bg-background/80 border-primary/10 border-b backdrop-blur-lg">
				{/* Decorative top line */}
				<div className="via-primary/30 h-0.5 bg-gradient-to-r from-transparent to-transparent" />
				<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
					<div className="flex h-16 items-center justify-between sm:h-18">
						<Logo href="/" size={40} showText />

						{/* Security badge - desktop only */}
						<div className="text-muted-foreground font-display hidden items-center gap-1.5 text-sm tracking-wide md:flex">
							<Lock className="size-3.5" />
							Paiement sécurisé
						</div>

						<Link
							href="/produits"
							aria-label="Continuer mes achats"
							className="group text-muted-foreground hover:text-foreground hover:bg-accent inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors"
						>
							<ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
							<span className="hidden sm:inline">Continuer mes achats</span>
						</Link>
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
