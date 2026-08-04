"use client";

import { usePathname } from "next/navigation";

import { resolveNavbarSection } from "./navbar-section";

/**
 * Nom de la salle courante, révélé dans la barre une fois la page scrollée —
 * **sous `lg` uniquement**.
 *
 * ## Le problème qu'il résout
 *
 * Sous `lg`, la barre ne porte plus que le burger et la marque : le cluster
 * d'actions est parti pour la bottom-bar (déduplication 2026-08-04, à conserver).
 * La colonne de droite de la grille `1fr auto 1fr` est donc littéralement vide,
 * sur toute la plage jusqu'à 1024 px. Et surtout : c'est aussi la plage où il n'y
 * a **aucune navigation visible**. Une fois le fil d'Ariane sorti de l'écran,
 * plus rien ne dit où on est.
 *
 * À partir de `lg`, la nav le dit elle-même (aplat d'accent + trait encré sur
 * l'entrée courante) — d'où le `lg:hidden`.
 *
 * ## Pourquoi ce n'est pas un lien, et pourquoi il est `aria-hidden`
 *
 * C'est un repère visuel qui double une information déjà portée par le fil
 * d'Ariane, le `<h1>` et l'`aria-current` de la nav. En faire une cible de plus
 * ajouterait un doublon dans l'ordre de tabulation et une troisième annonce du
 * même mot. Corollaire : les libellés viennent de `navbar-section.ts` et ne sont
 * PAS des noms accessibles — renommer une entrée de nav ne casse rien ici, et
 * réciproquement les specs E2E (`getByRole("link", { name: /Les créations/i })`)
 * ne peuvent pas matcher ce `<span>`.
 *
 * ## Mouvement
 *
 * Fondu + 4 px de translation sur 200 ms (`--duration-normal`). Le variant
 * `motion-safe:` gate la TRANSITION, jamais l'état : sous
 * `prefers-reduced-motion`, le libellé apparaît sèchement — l'information reste,
 * seule la traversée disparaît.
 */
export function NavbarRoomLabel() {
	const { label } = resolveNavbarSection(usePathname());

	if (!label) return null;

	return (
		<span
			aria-hidden="true"
			className={[
				// ⚠️ `text-xs` sous `sm`, et ce n'est pas de la coquetterie. Cette
				// colonne est `flex-1` à base 0 : elle reçoit
				// `(largeur utile − logo mobile − gouttières) / 2`, soit ~57 px à 320 px
				// et ~92 px à 390 px. En `text-sm`, « Collections » en demandait plus
				// que ça — le repère se rendait tronqué sur tous les téléphones
				// courants. Libellés raccourcis en parallèle (cf. `navbar-section.ts`).
				"font-display text-foreground/70 min-w-0 truncate text-xs font-medium sm:text-sm lg:hidden",
				"translate-y-1 opacity-0",
				"motion-safe:transition-[opacity,translate] motion-safe:duration-[var(--duration-normal)] motion-safe:ease-[var(--ease-smooth-out)]",
				// Groupe NOMMÉ : le header porte `group/navbar` et non `group` nu.
				"group-data-[scrolled=true]/navbar:translate-y-0 group-data-[scrolled=true]/navbar:opacity-100",
			].join(" ")}
		>
			{label}
		</span>
	);
}
