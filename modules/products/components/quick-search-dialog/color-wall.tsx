"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Stagger } from "@/shared/components/animations/stagger";
import { isLightColor } from "@/modules/colors/utils/color-contrast.utils";
import { buildSwatchStyle } from "@/modules/colors/utils/swatch-style";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { withViewTransition } from "@/shared/utils/view-transition";

import type { QuickSearchColor } from "./constants";

interface ColorWallProps {
	colors: QuickSearchColor[];
	/** Ferme le dialog — appelé avant la navigation, comme les autres sorties. */
	onSelect: () => void;
	/**
	 * Marque les pastilles `data-qs-option` pour le roving aux flèches.
	 *
	 * `false` dans l'état « aucun résultat » : ce mur-là est rendu HORS du
	 * `role="listbox"`, en mode recherche où le roving désigne l'option courante
	 * par `aria-activedescendant`. Le laisser navigable ferait pointer cet
	 * attribut sur un nœud extérieur au listbox qui le porte — un `listbox` ne
	 * possède que des `option`/`group`, et un descendant actif doit lui appartenir.
	 * @default true
	 */
	navigable?: boolean;
}

/**
 * Le nuancier : le panneau au repos, mais en couleurs.
 *
 * La première question d'une boutique de bijoux colorés n'est pas « quel mot ? »
 * mais « quelle couleur ? ». Chaque pastille sort vers `/produits?color=<slug>`
 * — un filtre déjà en place (`product-query.schemas.ts`), donc aucune surface
 * nouvelle côté catalogue.
 *
 * Trois règles qui ne se devinent pas :
 *
 * - **Le nom vit SOUS la pastille, jamais dedans.** Aucune teinte du catalogue
 *   n'est garantie lisible sous du texte, et la palette est saisie par la
 *   créatrice : on ne peut rien présumer de son contraste.
 * - **Le focus est un anneau `--foreground`, pas un anneau teinté** (utilitaire
 *   `focus-ring`) : 19,5:1 quelle que soit la pastille. C'est ce qui rend un mur
 *   coloré conforme à WCAG 1.4.11 sans dépendre des données.
 * - **Pas de `role="option"`.** En idle le conteneur n'est pas un `listbox` :
 *   une option y serait orpheline. `data-qs-option` porte la navigation, qui
 *   déplace le focus DOM réel — annoncé nativement, sans une ligne d'ARIA.
 *
 * Direction « C — Le nuancier », audit DA du 2026-08-05.
 */
export function ColorWall({ colors, onSelect, navigable = true }: ColorWallProps) {
	const router = useRouter();

	if (colors.length === 0) return null;

	const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
		// Let the browser handle modifier clicks (new tab, etc.)
		if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
		event.preventDefault();
		triggerHaptic("selection");
		onSelect();
		// `replace`, jamais `push` : ce handler `preventDefault()` donc Next sort AVANT
		// de lire la prop `replace` du `<Link>` — la déclarer là ne suffit pas, c'est
		// ici que la navigation se décide.
		withViewTransition(() => router.replace(href));
	};

	return (
		<Stagger
			as="ul"
			itemAs="li"
			className="grid grid-cols-4 gap-2 sm:grid-cols-6"
			stagger={0.02}
			delay={0.03}
			y={8}
		>
			{colors.map((color) => {
				const href = `/produits?color=${encodeURIComponent(color.slug)}`;
				// Une teinte quasi blanche disparaît sur le fond du panneau : elle a
				// besoin d'un vrai bord, pas d'un liseré interne. Même arbitrage (et
				// même seuil) que la section « Couleurs » du filtre catalogue.
				const isPale = isLightColor(color.hex ?? "#CCCCCC", 0.85);

				return (
					<Link
						key={color.slug}
						href={href}
						// `replace` : consomme l'entrée d'historique du dialog
						// (CLAUDE.md § Overlays), comme toutes les sorties du panneau.
						replace
						onClick={(event) => handleClick(event, href)}
						data-active={undefined}
						// Cf. la prop `navigable` : marqueur de NAVIGATION, jamais `role="option"`.
						{...(navigable ? { "data-qs-option": "" } : {})}
						// Reached via arrow keys, not Tab (combobox pattern).
						tabIndex={navigable ? -1 : undefined}
						className={cn(
							"flex flex-col items-center gap-1.5 rounded-xl p-1.5",
							"hover:bg-muted transition-colors",
							"data-[active=true]:bg-muted",
							"touch-manipulation",
							// L'anneau `--foreground` de `focus-ring` est décalé de 2 px pour
							// que le fond du panneau fasse liseré : sans ça il touche la
							// pastille et se perd sur une teinte sombre.
							"focus-ring focus-visible:outline-offset-2",
						)}
					>
						{/* `block` obligatoire : `size-*` sur un `<span>` inline est INERTE
							(boîte inline, ni largeur ni hauteur). */}
						<span
							aria-hidden="true"
							className={cn(
								"block size-14 shrink-0 rounded-full shadow-sm sm:size-11",
								isPale ? "border-border border" : "ring-1 ring-black/5 ring-inset",
							)}
							style={buildSwatchStyle(color.hex ? [color.hex] : [])}
						/>
						{/* `text-2xs` (jeton, 0.625rem) et non `text-[11px]` : une taille en px
							ne suit pas le réglage de police du navigateur (WCAG 1.4.4). */}
						<span className="text-muted-foreground text-2xs w-full text-center leading-tight break-words">
							{color.name}
						</span>
					</Link>
				);
			})}
		</Stagger>
	);
}
