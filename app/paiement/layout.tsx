import { Logo } from "@/shared/components/logo"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

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
		<div className="min-h-screen bg-background flex flex-col">
			{/* Header minimal */}
			<header className="border-b bg-background/95 backdrop-blur-sm">
				<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
					<div className="flex h-16 items-center justify-between">
						<Logo href="/" size={40} showText />
						<Link
							href="/creations"
							className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							<ArrowLeft className="size-4" />
							<span className="hidden sm:inline">Continuer mes achats</span>
						</Link>
					</div>
				</div>
			</header>

			{/* Contenu */}
			<main id="checkout-content" className="flex-1">
				{children}
			</main>
		</div>
	)
}
