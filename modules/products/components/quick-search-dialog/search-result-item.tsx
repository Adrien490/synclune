"use client";

import Image from "next/image";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Tap } from "@/shared/components/animations/tap";
import { isLightColor } from "@/modules/colors/utils/color-contrast.utils";
import { areAllColorsLight, buildTintBarStyle } from "@/modules/colors/utils/swatch-style";
import { Skeleton, SkeletonGroup, SkeletonText } from "@/shared/components/ui/skeleton";
import { formatEuro } from "@/shared/utils/format-euro";
import { cn } from "@/shared/utils/cn";

import { SEARCH_SYNONYMS } from "../../constants/search-synonyms";
import type { QuickSearchProduct } from "../../data/quick-search-products";
import { SKELETON_ROWS } from "./constants";
import { PAGE_FADE_NAVIGATION } from "@/shared/constants/view-transitions";

interface SearchResultItemProps {
	product: QuickSearchProduct;
	query: string;
	onSelect: () => void;
}

/**
 * Nombre de teintes portées par la barre de couleur. Au-delà, les segments
 * descendent sous 16 px sur une barre de 48 et cessent d'être identifiables ;
 * la ligne de prix, elle, les nomme TOUTES — c'est elle que lisent les lecteurs
 * d'écran, la barre étant décorative.
 */
const MAX_COLOR_SWATCHES = 3;

/**
 * Compact product result item for the quick search dialog.
 * Shows thumbnail, title with highlighted match, price, and color swatches.
 */
export function SearchResultItem({ product, query, onSelect }: SearchResultItemProps) {
	const router = useRouter();
	// Représentant = rang 0 : QUICK_SEARCH_SELECT livre les VARIANTs triés par (position, id)
	const defaultVariant = product.variants[0];
	if (!defaultVariant) return null;

	const image = product.media[0];
	const isOutOfStock = product.variants.every((s) => s.stock <= 0);
	const href = `/creations/${product.slug}`;

	// Expand query words with synonyms for highlighting
	// (e.g. searching "anneau" also highlights "bague" in the title)
	const synonymTerms = query
		.split(/\s+/)
		.filter(Boolean)
		.flatMap((word) => SEARCH_SYNONYMS.get(word.toLowerCase()) ?? []);

	// Couleurs uniques des variantes (schéma lean : une couleur par variante)
	const seen = new Set<string>();
	type SwatchEntry = { name: string; hex: string | null };
	const colors = product.variants.reduce<SwatchEntry[]>((acc, v) => {
		const c = v.color;
		if (c && !seen.has(c.name)) {
			seen.add(c.name);
			acc.push(c);
		}
		return acc;
	}, []);

	// La BARRE ne porte que les premières teintes ; la ligne de prix, elle, les
	// nomme toutes. Plus de compteur « +N » : il comptait un reste qui n'est plus
	// caché nulle part.
	const shownColors = colors.slice(0, MAX_COLOR_SWATCHES);
	const shownHexes = shownColors.map((c) => c.hex).filter((h): h is string => Boolean(h));
	const tintBarIsPale = areAllColorsLight(shownHexes, (hex) => isLightColor(hex, 0.85));

	const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
		// Let the browser handle modifier clicks (new tab, etc.)
		if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
		event.preventDefault();
		onSelect();
		// `replace`, jamais `push` : ce handler `preventDefault()` donc Next sort AVANT
		// de lire la prop `replace` du `<Link>`. C'est ici que la navigation se décide.
		router.replace(href, PAGE_FADE_NAVIGATION);
	};

	return (
		<Tap scale={0.97}>
			<Link
				href={href}
				prefetch
				// `replace` : consomme l'entrée d'historique poussée à l'ouverture du
				// dialog (même URL que la page d'origine) — sinon une pression retour
				// morte par cycle ouvrir→naviguer (CLAUDE.md § Overlays).
				replace
				onClick={handleClick}
				onPointerEnter={() => router.prefetch(href)}
				data-active={undefined}
				data-qs-option=""
				role="option"
				aria-selected={false}
				// Out of the Tab order: reached via arrow keys (aria-activedescendant
				// combobox pattern). Still matched by FOCUSABLE_SELECTOR.
				tabIndex={-1}
				className={cn(
					"group/result flex items-center gap-3 rounded-xl px-3 py-2.5",
					"hover:bg-muted transition-colors",
					"focus-ring",
					"min-h-14 touch-manipulation",
					"data-[active=true]:bg-muted",
				)}
			>
				{/* Barre de teinte — accolée au bord gauche de la vignette, pleine hauteur.
					C'ÉTAIENT trois pastilles de 8 px groupées dans la gouttière DROITE, à
					28 px du bord et séparées du titre par toute la largeur de la ligne :
					le traitement d'un attribut secondaire, pour une marque dont la couleur
					EST le premier critère de choix. Ici elle devient un repère de scan.
					Audit DA 2026-08-05 (P1-2). */}
				<div className="flex shrink-0 items-center gap-2">
					{shownColors.length > 0 && (
						<span
							// ⚠️ `aria-hidden`, et non `role="img"` + `aria-label`. Le nom
							// accessible d'une `option` se calcule DEPUIS SON CONTENU, et
							// l'`aria-label` d'un enfant y participe : cette barre étant le
							// PREMIER enfant du lien depuis le redesign du 2026-08-05, l'option
							// s'annonçait « Couleurs : Or jaune, Argent, Bague Lune, 45,00 € » —
							// le titre, seul discriminant réel entre deux résultats, arrivait en
							// troisième position, derrière une énumération. L'énoncé des teintes
							// vit désormais dans la ligne de prix, APRÈS le titre, là où il est
							// déjà écrit à l'écran. Audit UI/UX 2026-08-05 (P2-4).
							aria-hidden="true"
							// Décorative et donc sans rôle : ce marqueur est la seule prise
							// possible pour un test.
							data-slot="tint-bar"
							className={cn(
								"h-12 w-1 shrink-0 rounded-full ring-1 ring-inset",
								// Une barre entièrement pâle (argent + or blanc, perle + cristal…)
								// disparaît sur le fond du panneau : elle a besoin d'un vrai
								// contour. `ring-inset` plutôt qu'un `border` — sur 4 px de large,
								// une bordure mangerait la moitié de la teinte. Même seuil et même
								// helper que les pastilles de `ProductCard`.
								tintBarIsPale ? "ring-border" : "ring-black/10",
							)}
							style={buildTintBarStyle(shownHexes)}
						/>
					)}

					{/* Thumbnail (view-transition morph to PDP) */}
					<div
						className="bg-muted size-12 shrink-0 overflow-hidden rounded-lg"
						style={{ viewTransitionName: `pdp-thumb-${product.slug}` }}
					>
						{image ? (
							<Image
								src={image.url}
								alt={image.alt ?? product.name}
								width={48}
								height={48}
								sizes="48px"
								quality={IMAGE_QUALITY.THUMBNAIL}
								className="size-full object-cover transition-transform duration-200 group-hover/result:scale-110"
								placeholder="empty"
							/>
						) : (
							<div className="bg-muted size-full" />
						)}
					</div>
				</div>

				{/* Content */}
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium">
						<HighlightMatch text={product.name} query={query} synonyms={synonymTerms} />
					</p>
					<div className="mt-0.5 flex items-center gap-2 overflow-hidden">
						{/* Price — pas de prix barré/remise (retrait Omnibus 2026-08-08, cf. ProductPrice) */}
						<span className="text-muted-foreground shrink-0 text-sm">
							{formatEuro(defaultVariant.priceCents ?? product.priceCents)}
						</span>

						{/* Out of stock badge */}
						{isOutOfStock && (
							<span className="text-destructive shrink-0 text-xs font-medium">Rupture</span>
						)}

						{/* Les noms de teintes rejoignent la ligne de prix : c'est là que se
							lit ce qui distingue deux résultats dont les titres commencent
							tous par « Bague ». C'est aussi le SEUL énoncé des couleurs
							désormais — la barre de teinte est passée `aria-hidden` pour que
							le titre ouvre l'annonce de l'option (cf. son commentaire).
							`truncate` tronque à l'œil seulement : le texte reste entier dans
							le DOM, donc les lecteurs d'écran l'ont en entier. */}
						{colors.length > 0 && (
							<span className="text-muted-foreground truncate text-sm">
								{colors.map((c) => c.name).join(", ")}
							</span>
						)}
					</div>
				</div>
			</Link>
		</Tap>
	);
}

/**
 * Skeleton for quick search results matching the SearchResultItem layout.
 */
export function SearchResultsSkeleton() {
	return (
		<SkeletonGroup label="Chargement des résultats…" className="space-y-2 p-4">
			{Array.from({ length: SKELETON_ROWS }).map((_, i) => (
				<div key={i} className="flex items-center gap-3 py-2">
					{/* La barre de teinte fait partie du gabarit depuis le 2026-08-05 :
						sans elle, la vignette et le titre se décalaient de ~12 px à
						l'arrivée des résultats. Même conteneur, mêmes largeurs. */}
					<div className="flex shrink-0 items-center gap-2">
						<Skeleton shape="rounded" className="h-12 w-1 shrink-0" />
						<Skeleton shape="rounded" className="size-12 shrink-0" />
					</div>
					<div className="min-w-0 flex-1">
						<SkeletonText lines={2} />
					</div>
				</div>
			))}
		</SkeletonGroup>
	);
}

/**
 * Highlights matching substrings in text by wrapping them in <mark>.
 * Case-insensitive, escapes regex special characters.
 * Uses index-based alternation: odd indices from split(/(pattern)/) are matches.
 *
 * Accepts optional synonyms to highlight terms that matched via synonym expansion
 * (e.g. searching "anneau" highlights "Bague" in "Bague Lune").
 */
export function HighlightMatch({
	text,
	query,
	synonyms,
}: {
	text: string;
	query: string;
	synonyms?: string[];
}) {
	const allTerms = [query, ...(synonyms ?? [])].map((t) => t.trim()).filter(Boolean);

	if (allTerms.length === 0) {
		return <>{text}</>;
	}

	const escaped = allTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
	const regex = new RegExp(`(${escaped.join("|")})`, "gi");
	const parts = text.split(regex);

	return (
		<>
			{parts.map((part, i) =>
				i % 2 === 1 ? (
					<mark
						key={`highlight-${i}`}
						className="bg-primary/25 text-foreground rounded-sm font-medium"
					>
						{part}
					</mark>
				) : (
					<span key={`part-${i}`}>{part}</span>
				),
			)}
		</>
	);
}
