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
	delay: (baseMs: number, index: number) => number;
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

export function UserHeader({ session, wishlistCount, cartCount }: UserHeaderProps) {
	const onNavigate = useMenuSheetNavigate();
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string should also be treated as missing
	const firstName = session.user.name?.split(" ")[0] || null;
	const greeting = firstName ? `Bonjour ${firstName}` : "Bonjour";
	const labelSubject = firstName ?? "bienvenue";

	return (
		<div className="bg-primary/5 mb-4 rounded-xl p-4">
			<Link
				href={ROUTES.ADMIN.DASHBOARD}
				replace
				prefetch={null}
				onClick={onNavigate}
				className="group block"
				aria-label={`Administration - ${labelSubject}${wishlistCount > 0 ? `, ${wishlistCount} favori${wishlistCount > 1 ? "s" : ""}` : ""}${cartCount > 0 ? `, ${cartCount} article${cartCount > 1 ? "s" : ""}` : ""}`}
			>
				<div>
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
			</Link>
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
	delay,
}: DiscoverSectionProps) {
	if (!homeItem) return null;

	return (
		<section aria-label="Accès direct" className="mb-2">
			<ul className="space-y-1">
				<NavLink
					href={homeItem.href}
					isMenuItemActive={isMenuItemActive}
					itemVariants={itemVariants}
					customDelay={delay(70, 0)}
				>
					{homeItem.label}
				</NavLink>
				{aboutItem && (
					<NavLink
						href={aboutItem.href}
						isMenuItemActive={isMenuItemActive}
						itemVariants={itemVariants}
						customDelay={delay(70, 1)}
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
	delay,
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
					customDelay={delay(90, 0)}
					exact
				>
					Tous les bijoux
				</NavLink>
				{productTypes.map((type, i) => (
					<NavLink
						key={type.slug}
						href={ROUTES.SHOP.PRODUCT_TYPE(type.slug)}
						isMenuItemActive={isMenuItemActive}
						itemVariants={itemVariants}
						customDelay={delay(90, i + 1)}
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
	delay,
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
					customDelay={delay(110, 0)}
					exact
				>
					Toutes les collections
				</NavLink>
				{displayedCollections.map((collection, i) => (
					<NavLink
						key={collection.slug}
						href={ROUTES.SHOP.COLLECTION(collection.slug)}
						isMenuItemActive={isMenuItemActive}
						itemVariants={itemVariants}
						customDelay={delay(110, i + 1)}
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
 */
export function AccountSection({
	favoritesItem,
	isLoggedIn,
	wishlistCount,
	onLogoutClick,
	isMenuItemActive,
	itemVariants,
	delay,
}: AccountSectionProps) {
	return (
		<section aria-labelledby="section-account">
			<SectionHeader id="section-account">Favoris</SectionHeader>
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
						customDelay={delay(150, 0)}
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
					<m.li variants={itemVariants} custom={delay(150, 1)}>
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
