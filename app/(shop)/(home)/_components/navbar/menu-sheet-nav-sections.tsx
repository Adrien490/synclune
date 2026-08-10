"use client";

import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import type { NavbarSessionData } from "@/shared/types/session.types";
import { CountBadge } from "@/shared/components/ui/count-badge";
import { SquiggleUnderline } from "@/shared/components/squiggle-underline";
import { ROUTES } from "@/shared/constants/urls";
import { cn } from "@/shared/utils/cn";
import type { Variants } from "motion/react";
import { m } from "motion/react";
import { HeartIcon, HouseIcon, ShoppingBagIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";
import { useMenuSheetNavigate } from "./menu-sheet-navigate-context";

/**
 * « L'étal de poche » (2026-08-05) — le volet n'est plus une liste : les
 * familles sont des TUILES en grille, les doublons de la bottom-bar remontent
 * en bande de raccourcis, les collections descendent en bande de cartes.
 *
 * Règle d'accent commune à toutes les surfaces à état de ce volet : l'entrée
 * courante est un APLAT `bg-primary` sous encre `--foreground` + filet
 * `border-l-foreground` — jamais un accent en trait ni une pastille hue-only
 * (l'ancienne pastille rose mesurait 1,06:1 contre le fond du volet, un état
 * qui n'existait qu'en couleur). Verrouillé par
 * `__tests__/menu-sheet-accent-ink.regression.test.ts`.
 *
 * ⚠️ L'aplat était en lavande de marque, et les deux titres de section étaient
 * soulignés lavande / menthe. **Tout est passé au rose signature le
 * 2026-08-06** (mono-rose de la navigation, cf. `navbar-section.ts`) : le volet
 * couvre l'étal ENTIER, il n'avait donc aucune salle à annoncer — sa lavande
 * était de la décoration, et elle contredisait le rose que la barre du bas et
 * le bandeau du header montraient au même moment. Le rose pastel donne 12,60:1
 * sous `--foreground` en aplat : le repère ne perd rien au change.
 *
 * Liens : toujours `replace` (consomme l'entrée d'historique du panneau) +
 * `onClick={useMenuSheetNavigate()}` (fermeture par la prop contrôlée, jamais
 * `SheetClose` — cf. `menu-sheet-navigate-context`). ⚠️ `prefetch={null}` est le
 * comportement PAR DÉFAUT de Next 16 (prefetch à l'entrée du viewport) — seul
 * `false` le désactive. Un ancien JSDoc promettait l'inverse ; il est mort avec
 * la liste, et cette note existe pour que la croyance ne renaisse pas.
 */

// ---------------------------------------------------------------------------
// Surfaces partagées des tuiles/cellules
// ---------------------------------------------------------------------------

/**
 * Base commune des cellules interactives (raccourcis, tuiles, cartes).
 *
 * `transition-[translate,scale,…]` et non `transform` : Tailwind v4 peint
 * `-translate-y-px` et `active:scale-*` via les propriétés natives `translate`
 * et `scale`, que `transition: transform` ne couvre pas.
 * `can-hover:motion-safe:active:` double le `motion-safe:active:` : sur
 * pointeur fin, une règle `can-hover:hover:*` émise après les variantes
 * intégrées écraserait le retour tactile (cf. audit galerie 2026-08-05).
 */
const cellClassName = cn(
	"relative flex w-full rounded-[10px] border border-border/60 bg-card",
	"focus-ring antialiased",
	"ease-out motion-safe:transition-[translate,scale,background-color,border-color,color] motion-safe:duration-[var(--duration-fast)]",
	"can-hover:hover:-translate-y-px",
	"motion-safe:active:scale-[0.98] can-hover:motion-safe:active:scale-[0.98]",
);

/** Aplat + filet du repère « tu es ici » — cf. le JSDoc d'en-tête. */
const currentCellClassName =
	"border-transparent bg-primary border-l-[3px] border-l-foreground font-semibold shadow-sm";

interface SectionProps {
	isMenuItemActive: (href: string, options?: { exact?: boolean }) => boolean;
	itemVariants: Variants;
	/**
	 * Rend le délai d'apparition du PROCHAIN élément, en secondes.
	 *
	 * ⚠️ Signature volontairement sans argument : les sections calculaient chacune
	 * leur base — 90 ms pour les créations, 110 pour les collections — ce qui
	 * produisait une cascade non monotone — cf. `menu-sheet-nav.tsx`. L'ordre est
	 * désormais celui des appels, donc celui du DOM. **Appeler une seule fois par
	 * élément rendu**, et dans l'ordre où ils apparaissent.
	 */
	nextDelay: () => number;
}

// ---------------------------------------------------------------------------
// Tête éditoriale (greffe de la direction C)
// ---------------------------------------------------------------------------

/**
 * La ligne à la première personne, au-dessus de la grille. Copie STATIQUE à
 * dessein : une phrase d'inventaire (« en ce moment je travaille… ») exigerait
 * de Léane une mise à jour récurrente, et périmée elle abîmerait la confiance
 * plus qu'un menu neutre. Celle-ci ne périme pas.
 */
export function MenuSheetHeadNote({
	itemVariants,
	customDelay,
}: {
	itemVariants: Variants;
	customDelay: number;
}) {
	return (
		<m.div variants={itemVariants} custom={customDelay} className="mx-4 mt-1 mb-4">
			<p className="font-display text-muted-foreground pt-1.5 pl-1 text-[0.8125rem] leading-relaxed">
				Chaque pièce est faite à la main, dans mon atelier.
			</p>
		</m.div>
	);
}

// ---------------------------------------------------------------------------
// Titre de section — display + trait dessiné
// ---------------------------------------------------------------------------

/**
 * ⚠️ Plus de prop `stroke` : le trait prend le défaut de `SquiggleUnderline`,
 * soit `var(--primary)`. Les deux titres étaient soulignés lavande (Créations)
 * et menthe (Collections) — deux teintes de plus dans un volet passé au
 * mono-rose (2026-08-06). Décoratif et doublé du titre, donc rien à compenser.
 */
function SectionHead({
	id,
	className,
	children,
}: {
	id?: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<h3 id={id} className={cn("text-foreground font-display text-sm font-medium", className)}>
			<span className="relative inline-block pb-1.5">
				{children}
				<SquiggleUnderline drawn className="bottom-0 h-2 w-full" />
			</span>
		</h3>
	);
}

// ---------------------------------------------------------------------------
// User Header (mobile menu personalized greeting)
// ---------------------------------------------------------------------------

interface UserHeaderProps {
	session: NavbarSessionData;
	wishlistCount: number;
	cartCount: number;
}

/**
 * Bloc d'identité en tête du menu — **non interactif**.
 *
 * ⚠️ C'était un `<Link>` vers `ROUTES.ADMIN.DASHBOARD`. Or `MenuSheetNav` rend
 * plus bas une entrée « Tableau de bord » vers `ROUTES.ADMIN.ROOT`, et les deux
 * constantes valent `"/admin"` (`shared/constants/urls.ts`) : la même
 * destination était offerte DEUX fois dans le même panneau, à ~400 px d'écart
 * vertical, avec deux libellés qui ne se ressemblaient pas.
 *
 * C'est ce bloc-ci qui a perdu son lien, et pas l'autre : « Bonjour Léane » se
 * lit comme une carte d'identité, pas comme une destination — le libellé
 * explicite « Tableau de bord » porte mieux l'action. Bénéfice secondaire : un
 * arrêt de tabulation en moins, et la disparition d'un nom accessible qui
 * empilait la civilité et deux compteurs (« Administration - Léane, 3 favoris,
 * 2 articles ») sur un lien dont la destination n'était ni l'un ni l'autre.
 */
export function UserHeader({ session, wishlistCount, cartCount }: UserHeaderProps) {
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string should also be treated as missing
	const firstName = session.user.name?.split(" ")[0] || null;
	const greeting = firstName ? `Bonjour ${firstName}` : "Bonjour";

	return (
		<div className="bg-primary/5 mx-4 mb-4 rounded-xl p-4">
			<p className="text-foreground text-base font-semibold">{greeting}</p>
			<p className="text-muted-foreground mt-0.5 text-sm">
				{wishlistCount > 0 && (
					<span>
						{wishlistCount} favori{wishlistCount > 1 ? "s" : ""}
					</span>
				)}
				{wishlistCount > 0 && cartCount > 0 && <span aria-hidden="true"> • </span>}
				{cartCount > 0 && (
					<span>
						{cartCount} article{cartCount > 1 ? "s" : ""}
					</span>
				)}
				{wishlistCount === 0 && cartCount === 0 && <span>Espace administration</span>}
			</p>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Bande de raccourcis — les doublons de la bottom-bar, en 44 px au lieu de
// trois lignes pleines
// ---------------------------------------------------------------------------

// Rangée HORIZONTALE de 44 px (icône à gauche du libellé), pas une colonne :
// chaque pixel de hauteur gagné ici remonte la bande Collections vers l'écran —
// l'artifact budget ~630 px de contenu pour que l'étal tienne sans défiler.
const shortcutClassName = cn(
	cellClassName,
	"min-h-11 items-center justify-center gap-1.5 px-2 py-2",
	"text-foreground/85 text-xs font-medium",
	"can-hover:hover:text-foreground",
);

interface ShortcutsBandProps extends SectionProps {
	homeItem?: { href: string; label: string };
	wishlistCount: number;
	cartCount: number;
	/** Ferme le menu PUIS ouvre le cart sheet — cf. `MenuSheet.pendingAction`. */
	onCartClick?: () => void;
}

/**
 * Accueil · Favoris · Panier : les trois destinations que la barre du bas offre
 * déjà sous le pouce. Elles restent joignables depuis le volet (fermer le menu
 * pour taper un onglet serait une punition), mais compressées en une bande de
 * cellules — le premier écran appartient à ce que le volet est SEUL à offrir.
 *
 * « Panier » est un `<button>` (le panier est un sheet, pas une route), sans
 * `aria-controls` : même règle documentée que la bottom-bar — désigner un id
 * absent du document est plus nuisible que de l'omettre.
 */
export function ShortcutsBand({
	homeItem,
	wishlistCount,
	cartCount,
	onCartClick,
	isMenuItemActive,
	itemVariants,
	nextDelay,
}: ShortcutsBandProps) {
	const onNavigate = useMenuSheetNavigate();
	const homeHref = homeItem?.href ?? ROUTES.SHOP.HOME;
	const homeActive = isMenuItemActive(homeHref, { exact: true });
	const favoritesActive = isMenuItemActive(ROUTES.SHOP.FAVORITES);

	return (
		<section aria-label="Accès rapide" className="mb-4 px-4">
			<ul className="grid grid-cols-3 gap-2">
				<m.li variants={itemVariants} custom={nextDelay()} className="min-w-0">
					<Link
						href={homeHref}
						replace
						prefetch={null}
						onClick={onNavigate}
						aria-current={homeActive ? "page" : undefined}
						className={cn(shortcutClassName, homeActive && currentCellClassName)}
					>
						<HouseIcon
							size={20}
							weight={homeActive ? "fill" : "regular"}
							aria-hidden="true"
							className={homeActive ? "text-foreground" : undefined}
						/>
						{homeItem?.label ?? "Accueil"}
					</Link>
				</m.li>
				<m.li variants={itemVariants} custom={nextDelay()} className="min-w-0">
					{/*
					 * Favoris — accessible à TOUS, sans gate de session : le cookie
					 * `wishlist` ne dépend d'aucun compte. Le compteur passe par le nom
					 * accessible (badge `dot` muet + `silentLiveRegion`, les annonces
					 * vivent déjà dans la bottom-bar).
					 */}
					<Link
						href={ROUTES.SHOP.FAVORITES}
						replace
						prefetch={null}
						onClick={onNavigate}
						aria-current={favoritesActive ? "page" : undefined}
						aria-label={
							wishlistCount > 0
								? `Favoris, ${wishlistCount} favori${wishlistCount > 1 ? "s" : ""}`
								: undefined
						}
						className={cn(shortcutClassName, favoritesActive && currentCellClassName)}
					>
						<span className="relative">
							<HeartIcon
								size={20}
								weight={favoritesActive ? "fill" : "regular"}
								aria-hidden="true"
								className={favoritesActive ? "text-foreground" : undefined}
							/>
							<CountBadge
								count={wishlistCount}
								size="sm"
								type="dot"
								positionClassName="absolute -top-0.5 -right-1"
								singularLabel="favori"
								pluralLabel="favoris"
								silentLiveRegion
							/>
						</span>
						Favoris
					</Link>
				</m.li>
				<m.li variants={itemVariants} custom={nextDelay()} className="min-w-0">
					<button
						type="button"
						aria-haspopup="dialog"
						aria-label={
							cartCount > 0 ? `Panier, ${cartCount} article${cartCount > 1 ? "s" : ""}` : undefined
						}
						onClick={onCartClick}
						className={shortcutClassName}
					>
						<span className="relative">
							<ShoppingBagIcon size={20} weight="regular" aria-hidden="true" />
							<CountBadge
								count={cartCount}
								size="sm"
								variant="inline"
								positionClassName="absolute -top-1.5 -right-2"
								singularLabel="article dans le panier"
								pluralLabel="articles dans le panier"
								silentLiveRegion
							/>
						</span>
						Panier
					</button>
				</m.li>
			</ul>
		</section>
	);
}

// ---------------------------------------------------------------------------
// La grille des familles — le cœur de l'étal de poche
// ---------------------------------------------------------------------------

export interface MenuProductTypeItem {
	slug: string;
	label: string;
	/** Compte de pièces PUBLIC — `_count.products`, enfin consommé. */
	productCount?: number;
	/** Vignette choisie par `pickPrimaryImage()` côté serveur (`navbar.tsx`). */
	image?: { url: string; blurDataUrl: string | null } | null;
}

// `p-2 gap-2` et non plus large : à 390 px la colonne texte d'une tuile ne
// mesure que ~67 px une fois la photo de 68 posée — chaque pixel de padding se
// paie en césure (« Bracelets » cassait en plein mot avec p-2.5 + gap-3).
const tileClassName = cn(cellClassName, "min-h-[5.5rem] items-center gap-2 p-2");

function tilePiecesLabel(count: number) {
	return `${count} pièce${count > 1 ? "s" : ""}`;
}

/** Vignette 68 px de la tuile — décorative, le nom porte l'information. */
function TileThumb({ image }: { image?: MenuProductTypeItem["image"] }) {
	if (!image) {
		return <span className="bg-muted size-[4.25rem] shrink-0 rounded-[7px]" aria-hidden="true" />;
	}
	return (
		<span className="bg-muted relative size-[4.25rem] shrink-0 overflow-hidden rounded-[7px]">
			<Image
				src={image.url}
				alt=""
				fill
				sizes="68px"
				quality={IMAGE_QUALITY.THUMBNAIL}
				className="object-cover"
				placeholder={image.blurDataUrl ? "blur" : "empty"}
				blurDataURL={image.blurDataUrl ?? undefined}
				aria-hidden="true"
			/>
		</span>
	);
}

interface CreationsGridProps extends SectionProps {
	productTypes?: MenuProductTypeItem[];
}

/**
 * Les sept familles en grille 2 colonnes (3 à partir de `sm`, uniquement parce
 * que le volet grandit avec — un palier de colonnes sans conteneur plus large ne
 * ferait que rétrécir les tuiles). La 8ᵉ cellule « Voir tout » reprend
 * `/produits` en aplat rose.
 *
 * Sans aucune famille publiée, l'encart « L'atelier est en pause » remplace la
 * grille — l'ancien `return null` laissait un menu quasi vide sans un mot
 * d'explication. (L'état « boutique fermée » n'existe pas ici : le layout
 * remplace la boutique entière, navbar comprise, par `StoreClosurePage`.)
 */
export function CreationsGrid({
	productTypes,
	isMenuItemActive,
	itemVariants,
	nextDelay,
}: CreationsGridProps) {
	const onNavigate = useMenuSheetNavigate();
	const viewAllActive = isMenuItemActive(ROUTES.SHOP.PRODUCTS, { exact: true });

	if (!productTypes || productTypes.length === 0) {
		return (
			<section aria-label="Mes créations" className="mb-4 px-4">
				<m.div
					variants={itemVariants}
					custom={nextDelay()}
					className="border-border bg-card/60 rounded-md border-2 border-dashed px-5 py-8 text-center"
				>
					<p className="font-display text-foreground text-base">L&apos;atelier est en pause</p>
					<p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
						Je remets des pièces en ligne très vite. En attendant, tu peux m&apos;écrire.
					</p>
				</m.div>
			</section>
		);
	}

	return (
		<section aria-labelledby="menu-creations" className="mb-4">
			<SectionHead id="menu-creations" className="px-4 pt-1 pb-2">
				Mes créations
			</SectionHead>
			<ul className="grid grid-cols-2 gap-2 px-4 sm:grid-cols-3">
				{productTypes.map((type) => {
					const href = ROUTES.SHOP.PRODUCT_TYPE(type.slug);
					const active = isMenuItemActive(href);
					const count = type.productCount;
					return (
						<m.li key={type.slug} variants={itemVariants} custom={nextDelay()} className="min-w-0">
							<Link
								href={href}
								replace
								prefetch={null}
								onClick={onNavigate}
								aria-current={active ? "page" : undefined}
								// Le compte visible est `aria-hidden` et replié ici : sans ça le
								// nom accessible du lien embarquait un retour à la ligne.
								aria-label={
									count != null && count > 0
										? `${type.label}, ${tilePiecesLabel(count)}`
										: undefined
								}
								className={cn(tileClassName, active && currentCellClassName)}
							>
								<TileThumb image={type.image} />
								<span className="flex min-w-0 flex-col gap-0.5">
									<span className="font-display text-foreground text-sm leading-tight break-words hyphens-auto">
										{type.label}
									</span>
									{count != null && count > 0 && (
										<span
											aria-hidden="true"
											className={cn(
												"text-[0.6875rem] tabular-nums",
												active ? "text-foreground" : "text-muted-foreground",
											)}
										>
											{tilePiecesLabel(count)}
										</span>
									)}
								</span>
							</Link>
						</m.li>
					);
				})}
				<m.li variants={itemVariants} custom={nextDelay()} className="min-w-0">
					<Link
						href={ROUTES.SHOP.PRODUCTS}
						replace
						prefetch={null}
						onClick={onNavigate}
						aria-current={viewAllActive ? "page" : undefined}
						className={cn(
							tileClassName,
							"bg-primary text-foreground justify-center border-transparent",
							"font-display text-[0.9375rem]",
							viewAllActive && "border-l-foreground border-l-[3px] font-semibold",
						)}
					>
						Voir tout
					</Link>
				</m.li>
			</ul>
		</section>
	);
}

// ---------------------------------------------------------------------------
// ⚠️ Plus de `CollectionsBand` (supprimée le 2026-08-08)
// ---------------------------------------------------------------------------
//
// Elle rendait trois tirages photo de collection ; elle est partie avec toutes
// les autres surfaces à cartes de collection (carte de la landing, bento du
// méga-menu, chapitres de `/collections`), à refaire.
//
// La destination `/collections` n'a PAS disparu du volet pour autant : cette
// bande en portait le seul lien sous `lg`, et `MenuSheetNav` la rend désormais
// en rangée pleine largeur, servie par la SSOT `getMobileNavItems`.
