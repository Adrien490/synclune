"use client";

import type { CollectionImage } from "@/modules/collections/types/collection.types";
import type { NavbarSessionData } from "@/shared/types/session.types";
import { CountBadge } from "@/shared/components/ui/count-badge";
import { MAX_COLLECTIONS_IN_MENU } from "@/shared/constants/navigation";
import { ROUTES } from "@/shared/constants/urls";
import { cn } from "@/shared/utils/cn";
import type { Variants } from "motion/react";
import { m } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useMenuSheetNavigate } from "./menu-sheet-navigate-context";

// Shared link styles (must match menu-sheet-nav.tsx)
const linkClassName = cn(
	"flex items-center text-base/6 font-medium tracking-wide antialiased px-4 py-3.5 rounded-lg",
	"ease-out motion-safe:transition-[transform,color,background-color,padding] motion-safe:duration-[var(--duration-slow)]",
	"focus-ring",
	"text-foreground/85 can-hover:hover:text-foreground can-hover:hover:bg-primary/5 can-hover:hover:pl-5",
	"motion-safe:active:scale-[0.97]",
);

const activeLinkClassName = cn(
	linkClassName,
	"bg-primary/15 text-foreground font-semibold border-l-2 border-primary pl-5 shadow-sm",
);

interface SectionProps {
	isMenuItemActive: (href: string, options?: { exact?: boolean }) => boolean;
	itemVariants: Variants;
	/**
	 * Rend le délai d'apparition du PROCHAIN élément, en secondes.
	 *
	 * ⚠️ Signature volontairement sans argument : les sections calculaient chacune
	 * leur base — 90 ms pour les créations, 110 pour les collections, 140 pour le
	 * séparateur — ce qui produisait une cascade
	 * non monotone — cf. `menu-sheet-nav.tsx`. L'ordre est désormais celui des
	 * appels, donc celui du DOM. **Appeler une seule fois par élément rendu**, et
	 * dans l'ordre où ils apparaissent.
	 */
	nextDelay: () => number;
}

function getLinkClass(
	href: string,
	isMenuItemActive: SectionProps["isMenuItemActive"],
	extra?: string,
	options?: { exact?: boolean },
) {
	return cn(isMenuItemActive(href, options) ? activeLinkClassName : linkClassName, extra);
}

// --- Section Header (inline — no separate file needed) ---

function SectionHeader({
	children,
	id,
	as: Tag = "h3",
}: {
	children: React.ReactNode;
	id?: string;
	as?: "h2" | "h3";
}) {
	return (
		// Fraunces plutôt que des capitales grises : un en-tête de tableau de bord
		// dans un menu de boutique de bijoux. Même famille que les titres du
		// mega-menu desktop et des cartes Atelier.
		<Tag id={id} className="text-foreground font-display px-4 pt-3 pb-1.5 text-sm font-medium">
			{children}
		</Tag>
	);
}

// --- NavLink (shared pattern: m.li + Link + aria-current) ---
//
// ⚠️ PAS de `<SheetClose asChild>` ici : ce chemin déclenche `history.back()` et
// annule la navigation. Voir `menu-sheet-navigate-context` pour le détail.

interface NavLinkProps {
	href: string;
	isMenuItemActive: SectionProps["isMenuItemActive"];
	itemVariants: Variants;
	customDelay: number;
	children: React.ReactNode;
	className?: string;
	exact?: boolean;
	/** Pass `null` to opt out of automatic prefetch on viewport-rare destinations. */
	prefetch?: boolean | null;
	/**
	 * Nom accessible explicite. Nécessaire quand le contenu visible ne suffit pas
	 * — typiquement un `CountBadge`, qui est `aria-hidden` : sans cela le lien
	 * « Mes favoris » n'annonçait jamais son compteur.
	 */
	ariaLabel?: string;
}

function NavLink({
	href,
	isMenuItemActive,
	itemVariants,
	customDelay,
	children,
	className,
	exact,
	prefetch,
	ariaLabel,
}: NavLinkProps) {
	const onNavigate = useMenuSheetNavigate();

	return (
		<m.li variants={itemVariants} custom={customDelay}>
			<Link
				href={href}
				replace
				prefetch={prefetch}
				onClick={onNavigate}
				className={getLinkClass(href, isMenuItemActive, className, { exact })}
				aria-current={isMenuItemActive(href, { exact }) ? "page" : undefined}
				aria-label={ariaLabel}
			>
				{children}
			</Link>
		</m.li>
	);
}

// --- User Header (mobile menu personalized greeting) ---

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
		<div className="bg-primary/5 mb-4 rounded-xl p-4">
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

// --- Discover Section ---

interface DiscoverSectionProps extends SectionProps {
	homeItem?: { href: string; label: string };
	aboutItem?: { href: string; label: string };
}

/**
 * Bloc primaire du menu — sans en-tête de section.
 *
 * S'appelait « Découvrir » et coiffait DEUX entrées. Depuis que « L'atelier » ne
 * sort plus de `getMobileNavItems` (`ROUTES.SHOP.ABOUT` pointe `/a-propos`, une
 * route redirigée vers l'accueil), il n'en restait qu'une : un en-tête de section
 * pour le seul lien « Accueil ». La branche `aboutItem` est CONSERVÉE — c'est un
 * point d'extension documenté des deux côtés, dont le retrait a été refusé le
 * 2026-07-26 ; seul l'en-tête disparaît.
 */
export function DiscoverSection({
	homeItem,
	aboutItem,
	isMenuItemActive,
	itemVariants,
	nextDelay,
}: DiscoverSectionProps) {
	if (!homeItem) return null;

	return (
		<section aria-label="Accès direct" className="mb-2">
			<ul className="space-y-1">
				<NavLink
					href={homeItem.href}
					isMenuItemActive={isMenuItemActive}
					itemVariants={itemVariants}
					customDelay={nextDelay()}
				>
					{homeItem.label}
				</NavLink>
				{aboutItem && (
					<NavLink
						href={aboutItem.href}
						isMenuItemActive={isMenuItemActive}
						itemVariants={itemVariants}
						customDelay={nextDelay()}
					>
						{aboutItem.label}
					</NavLink>
				)}
			</ul>
		</section>
	);
}

// --- Creations Section ---

interface CreationsSectionProps extends SectionProps {
	productTypes?: Array<{ slug: string; label: string }>;
}

export function CreationsSection({
	productTypes,
	isMenuItemActive,
	itemVariants,
	nextDelay,
}: CreationsSectionProps) {
	if (!productTypes || productTypes.length === 0) return null;

	return (
		<section aria-labelledby="section-creations" className="mb-4">
			<SectionHeader id="section-creations">Nos créations</SectionHeader>
			<ul className="space-y-1">
				{/* "All jewelry" link prominent first (Baymard UX) */}
				<NavLink
					href={ROUTES.SHOP.PRODUCTS}
					isMenuItemActive={isMenuItemActive}
					itemVariants={itemVariants}
					customDelay={nextDelay()}
					exact
				>
					Tous les bijoux
				</NavLink>
				{productTypes.map((type) => (
					<NavLink
						key={type.slug}
						href={ROUTES.SHOP.PRODUCT_TYPE(type.slug)}
						isMenuItemActive={isMenuItemActive}
						itemVariants={itemVariants}
						customDelay={nextDelay()}
					>
						{type.label}
					</NavLink>
				))}
			</ul>
		</section>
	);
}

// --- Collections Section ---

/**
 * Vignette d'une collection dans le menu mobile.
 *
 * Les images étaient DÉJÀ dans les props du sheet (`collections[].images`,
 * alimentées par `extractCollectionImages`) et simplement ignorées : le desktop
 * en faisait une grille bento, le mobile n'affichait que du texte. C'était de la
 * donnée déjà chargée et jetée, sur une boutique de bijoux, du côté où passe
 * l'essentiel du trafic.
 */
function CollectionThumb({ images }: { images: CollectionImage[] }) {
	const image = images[0];

	if (!image) {
		return <span className="bg-muted size-9 shrink-0 rounded-md" aria-hidden="true" />;
	}

	return (
		<span className="bg-muted relative size-9 shrink-0 overflow-hidden rounded-md">
			<Image
				src={image.url}
				alt=""
				fill
				sizes="36px"
				className="object-cover"
				placeholder={image.blurDataUrl ? "blur" : "empty"}
				blurDataURL={image.blurDataUrl ?? undefined}
				aria-hidden="true"
			/>
		</span>
	);
}

interface CollectionsSectionProps extends SectionProps {
	collections?: Array<{
		slug: string;
		label: string;
		images: CollectionImage[];
	}>;
}

export function CollectionsSection({
	collections,
	isMenuItemActive,
	itemVariants,
	nextDelay,
}: CollectionsSectionProps) {
	const displayedCollections = collections?.slice(0, MAX_COLLECTIONS_IN_MENU);
	if (!displayedCollections || displayedCollections.length === 0) return null;

	return (
		<section aria-labelledby="section-collections" className="mb-4">
			<SectionHeader id="section-collections">Collections</SectionHeader>
			<ul className="space-y-1">
				{/* "All collections" link prominent first */}
				<NavLink
					href={ROUTES.SHOP.COLLECTIONS}
					isMenuItemActive={isMenuItemActive}
					itemVariants={itemVariants}
					customDelay={nextDelay()}
					exact
				>
					Toutes les collections
				</NavLink>
				{displayedCollections.map((collection) => (
					<NavLink
						key={collection.slug}
						href={ROUTES.SHOP.COLLECTION(collection.slug)}
						isMenuItemActive={isMenuItemActive}
						itemVariants={itemVariants}
						customDelay={nextDelay()}
						className="gap-3"
					>
						<CollectionThumb images={collection.images} />
						<span className="min-w-0 truncate">{collection.label}</span>
					</NavLink>
				))}
			</ul>
		</section>
	);
}

// --- Account Section ---

interface AccountSectionProps extends SectionProps {
	favoritesItem?: { href: string; label: string };
	/** Vraie uniquement pour une session admin — cf. `MenuSheetNav`. */
	isLoggedIn: boolean;
	wishlistCount: number;
	onLogoutClick?: () => void;
}

/**
 * Section « Favoris » du menu mobile.
 *
 * S'appelait « Mon compte » et portait quatre entrées — lien compte/connexion,
 * favoris, « Mes commandes », « Créer un compte ». Le retrait de l'espace client
 * (2026-07-31) n'en laisse qu'une côté visiteur : les favoris, qui ne dépendent
 * d'aucune session (cookie `wishlist_session`).
 *
 * « Déconnexion » subsiste et n'apparaît que pour la session admin, seule session
 * possible désormais.
 *
 * ⚠️ **Plus d'en-tête visible**, exactement pour la raison qui l'a fait retirer de
 * `DiscoverSection` quelques dizaines de lignes plus haut : il coiffait UN seul
 * lien pour 100 % du trafic public, et il s'appelait « Favoris » au-dessus de
 * « Mes favoris ». Il était en outre plus petit (Fraunces 14px) que l'entrée
 * qu'il classait (Figtree 16px) — le libellé qui classe rendu moins présent que
 * le libellé classé, donc lu comme deux entrées dont une inerte. Et il ne
 * couvrait de toute façon pas « Déconnexion », la seule entrée qui puisse s'y
 * ajouter. Le nom de la section survit en `aria-label`, pour l'arbre
 * d'accessibilité où une région sans nom est une région muette.
 */
export function AccountSection({
	favoritesItem,
	isLoggedIn,
	wishlistCount,
	onLogoutClick,
	isMenuItemActive,
	itemVariants,
	nextDelay,
}: AccountSectionProps) {
	return (
		<section aria-label="Favoris et compte">
			<ul className="space-y-1">
				{/*
				 * Favoris — accessible à TOUS, sans gate `isLoggedIn` : l'onglet de la
				 * bottom bar et l'icône cœur de la navbar sont visibles pour les
				 * invités, et la SSOT `getMobileNavItems` porte le commentaire
				 * « Accessible à tous ». Le gate faisait du sheet la seule surface à
				 * masquer les favoris. Le badge se masque seul à 0.
				 */}
				{favoritesItem && (
					<NavLink
						href={favoritesItem.href}
						isMenuItemActive={isMenuItemActive}
						itemVariants={itemVariants}
						customDelay={nextDelay()}
						className="justify-between"
						ariaLabel={
							wishlistCount > 0
								? `${favoritesItem.label}, ${wishlistCount} favori${wishlistCount > 1 ? "s" : ""}`
								: undefined
						}
					>
						{favoritesItem.label}
						<CountBadge
							count={wishlistCount}
							size="sm"
							variant="inline"
							positionClassName="inline-flex"
							singularLabel="favori"
							pluralLabel="favoris"
							silentLiveRegion
						/>
					</NavLink>
				)}

				{/* Logout (logged in only) — closes menu before opening dialog */}
				{isLoggedIn && (
					<m.li variants={itemVariants} custom={nextDelay()}>
						<button
							type="button"
							className={cn(
								linkClassName,
								"text-muted-foreground can-hover:hover:text-foreground w-full text-left",
							)}
							onClick={onLogoutClick}
						>
							Déconnexion
						</button>
					</m.li>
				)}
			</ul>
		</section>
	);
}
