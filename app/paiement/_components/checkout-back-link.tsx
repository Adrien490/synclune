"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { triggerHaptic } from "@/shared/hooks/use-haptic";

interface CheckoutBackLinkProps {
	href?: string;
	label?: string;
	accessibleLabel?: string;
}

export function CheckoutBackLink({
	href = "/produits",
	label = "Boutique",
	/**
	 * Nom accessible du lien.
	 *
	 * ⚠️ L'`aria-label` valait `label`, donc « Boutique » — il dupliquait mot pour
	 * mot le texte visible et n'apportait rien, tandis que la DIRECTION du lien
	 * (revenir) n'était portée que par l'icône, `aria-hidden`. Un utilisateur au
	 * rotor « liens » lisait « Boutique » sans savoir que c'est le retour.
	 *
	 * Le texte visible reste contenu dans le nom accessible (WCAG 2.5.3
	 * « Label in Name »).
	 */
	accessibleLabel = `Retour à la ${label.toLowerCase()}`,
}: CheckoutBackLinkProps) {
	return (
		<Link
			href={href}
			aria-label={accessibleLabel}
			onClick={() => triggerHaptic("selection")}
			className="group text-muted-foreground can-hover:hover:text-foreground can-hover:hover:bg-muted/60 focus-ring inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-lg p-2 text-sm motion-safe:transition-[transform,color,background-color] motion-safe:duration-150 motion-safe:active:scale-[0.98] sm:px-3"
		>
			<ArrowLeftIcon
				className="motion-safe:can-hover:group-hover:-translate-x-0.5 size-4 motion-safe:transition-transform"
				aria-hidden="true"
			/>
			{/* Visible à TOUTES les largeurs : le libellé était `hidden sm:inline` et le
			    badge de confiance `hidden sm:inline-flex`, si bien que sous 640px l'en-tête
			    du tunnel ne contenait AUCUN mot — une flèche qui ne dit pas où elle ramène,
			    et plus aucun signal de sécurité, exactement là où l'anxiété est maximale. */}
			<span>{label}</span>
		</Link>
	);
}
