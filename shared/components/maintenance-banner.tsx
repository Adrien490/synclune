import { Construction } from "lucide-react";
import Link from "next/link";

import { formatParisDateTime } from "@/modules/store-settings/utils/paris-datetime";
import { ROUTES } from "@/shared/constants/urls";

interface MaintenanceBannerProps {
	closureMessage: string | null;
	reopensAt: Date | null;
}

/**
 * Bottom banner shown to admins when the store is closed.
 * Gated to the ADMIN role at every call site — visitors see `StoreClosurePage` instead.
 */
export function MaintenanceBanner({ closureMessage, reopensAt }: MaintenanceBannerProps) {
	return (
		<section
			aria-label="Statut de la boutique"
			// Offset piloté par la seule variable, sans préfixe de breakpoint : elle
			// n'est publiée que lorsqu'une barre est visible (0 sinon), et la
			// bottom-nav boutique va désormais jusqu'à 64rem. Un `max-md:` figeait
			// le seuil et laissait le bandeau passer sous la barre en iPad portrait.
			//
			// La variable porte la hauteur MESURÉE, safe-area incluse. Le bandeau se
			// pose donc au ras de la barre sans rien réadditionner, et le
			// `max(…, env(…))` ne dégage l'indicateur d'accueil que dans le cas SANS
			// barre. Corollaire : le padding interne redevient un simple `pb-2.5`, sans
			// le `max(…)` ni son override `max-md:` qui compensaient l'encoche une
			// seconde fois (audit bottom-bar 2026-07-30).
			className="border-warning-foreground/20 bg-warning/95 text-warning-foreground fixed inset-x-0 bottom-[max(var(--bottom-bar-height,0px),env(safe-area-inset-bottom,0px))] z-(--z-bar) border-t px-4 py-2.5 text-center text-sm font-medium shadow-[0_-2px_10px_rgba(0,0,0,0.1)]"
		>
			<div className="mx-auto flex items-center justify-center gap-2">
				<Construction className="size-4 shrink-0" aria-hidden="true" />
				<span className="min-w-0 truncate">
					<span className="md:hidden">Boutique fermée</span>
					<span className="hidden md:inline">
						Mode maintenance : la boutique est fermée pour les visiteurs
					</span>
					{reopensAt && (
						<span className="ml-1 hidden md:inline">
							· Réouverture le {formatParisDateTime(reopensAt)}
						</span>
					)}
					{closureMessage && <span className="ml-1 hidden lg:inline">: {closureMessage}</span>}
				</span>
				<Link
					href={ROUTES.ADMIN.STORE_CONFIG}
					className="bg-warning-foreground/10 hover:bg-warning-foreground/20 focus-visible:ring-warning-foreground/60 focus-visible:ring-offset-warning ml-1 inline-flex min-h-6 shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
				>
					Gérer
				</Link>
			</div>
		</section>
	);
}
