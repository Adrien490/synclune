import { WarningIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/shared/components/ui/badge";

/**
 * Badge « Hors zone » — adresse Corse/DOM-TOM sur une commande payée.
 *
 * L'exclusion CGV §5.1 n'est pas bloquante au checkout hébergé (le CP n'est
 * connu qu'après paiement) : ce badge, posé en liste ET en détail via
 * `isUnshippableFrenchAddress`, est ce qui déclenche l'arbitrage de Léane.
 * Le libellé porte l'info — pas seulement l'icône (couleur seule interdite).
 */
export function UnshippableZoneBadge() {
	return (
		<Badge variant="destructive">
			<WarningIcon aria-hidden="true" className="size-3" />
			Hors zone
		</Badge>
	);
}
