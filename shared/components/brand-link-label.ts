import { BRAND } from "@/shared/constants/brand";

/**
 * Gabarit UNIQUE du nom accessible d'un lien de marque.
 *
 * Le nom était écrit à quatre endroits pour trois destinations identiques —
 * « Synclune - Accueil » (navbar), « Synclune - Retour à l'accueil » (panneau
 * mobile), « Synclune - Administration » (rail admin) et « Synclune » nu
 * (repli). Quatre libellés à maintenir, quatre cibles de test, et une collision
 * documentée dans `e2e/navigation.spec.ts` (le regex `/Accueil/i` matchait deux
 * éléments). Toute nouvelle surface de marque passe par ici.
 *
 * ⚠️ Module SANS `"use client"`, à dessein : la fonction est appelée depuis des
 * Server Components (`AdminSidebar`). Elle vivait dans `logo.tsx` (module
 * client) — un Server Component qui l'importait recevait une RÉFÉRENCE client
 * et crashait au rendu (« Attempted to call brandLinkLabel() from the
 * server »). `logo.tsx` la ré-exporte pour ses consommateurs clients.
 */
export function brandLinkLabel(href: string): string {
	if (href === "/") return `${BRAND.name} - Accueil`;
	if (href === "/admin") return `${BRAND.name} - Administration`;
	return BRAND.name;
}
