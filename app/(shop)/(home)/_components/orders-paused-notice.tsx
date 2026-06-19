import { Info } from "lucide-react";
import { ORDERS_PAUSED_NOTICE } from "@/shared/constants/orders-availability";
import { CONTAINER_CLASS } from "@/shared/constants/spacing";

/**
 * Bandeau d'information affiché sur la page d'accueil tant que les commandes ne
 * sont pas ouvertes (`ORDERS_AVAILABLE === false`).
 *
 * Choix de conception :
 * - Server Component, non masquable : le message doit rester visible (clientèle
 *   large, dont des personnes peu à l'aise avec le web — pas de croix à trouver,
 *   pas de cookie de masquage qui le ferait « disparaître »).
 * - Posé en tête de page : visible immédiatement à l'arrivée, mais sans bloquer
 *   la navigation (les créations et collections restent consultables en dessous).
 * - Ton doux + e-mail de contact mis en avant.
 */
export function OrdersPausedNotice() {
	return (
		<section
			aria-labelledby="orders-paused-title"
			// Première section de la page : réserve l'espace sous le navbar `fixed top-0 z-40`
			// (+ AnnouncementBar éventuelle), sinon son contenu serait masqué derrière le navbar.
			// Ce padding reste TRANSPARENT (aucun fond ici) : la bande recouverte par le navbar
			// transparent au repos (sans scroll) affiche alors le fond de page neutre — comme sur
			// les autres pages storefront (PageHeader) — au lieu de laisser le teint `bg-info/10`
			// remonter derrière le navbar. Le teint + bordure sont portés par le conteneur interne
			// ci-dessous, qui démarre sous l'offset navbar.
			className="pt-[calc(var(--navbar-height)+var(--announcement-bar-height,0px))]"
		>
			<div className="bg-info/10 border-info/30 border-b">
				<div className={CONTAINER_CLASS}>
					<div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:gap-4 sm:py-6">
						<Info
							className="text-info-foreground/80 size-6 shrink-0 sm:mt-0.5"
							aria-hidden="true"
						/>
						<div className="min-w-0 space-y-1.5">
							<h2
								id="orders-paused-title"
								className="text-foreground text-base font-semibold sm:text-lg"
							>
								{ORDERS_PAUSED_NOTICE.title}
							</h2>
							<p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
								{ORDERS_PAUSED_NOTICE.body}{" "}
								<a
									href={`mailto:${ORDERS_PAUSED_NOTICE.email}`}
									className="text-primary focus-ring rounded-sm font-medium break-all underline underline-offset-4 hover:no-underline"
								>
									{ORDERS_PAUSED_NOTICE.email}
								</a>
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
