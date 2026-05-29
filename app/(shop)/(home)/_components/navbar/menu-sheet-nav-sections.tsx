"use client";

import type { CollectionImage } from "@/modules/collections/types/collection.types";
import type { NavbarSessionData } from "@/shared/types/session.types";
import { CountBadge } from "@/shared/components/ui/count-badge";
import { SheetClose } from "@/shared/components/ui/sheet";
import { MAX_COLLECTIONS_IN_MENU } from "@/shared/constants/navigation";
import { ROUTES } from "@/shared/constants/urls";
import { cn } from "@/shared/utils/cn";
import type { Variants } from "motion/react";
import { m } from "motion/react";
import Link from "next/link";

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
		<Tag
			id={id}
			className="text-muted-foreground px-4 py-2 text-xs font-semibold tracking-wider uppercase"
		>
			{children}
		</Tag>
	);
}

// --- NavLink (shared pattern: m.li + SheetClose + Link + aria-current) ---

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
}: NavLinkProps) {
	return (
		<m.li variants={itemVariants} custom={customDelay}>
			<SheetClose asChild>
				<Link
					href={href}
					prefetch={prefetch}
					className={getLinkClass(href, isMenuItemActive, className, { exact })}
					aria-current={isMenuItemActive(href, { exact }) ? "page" : undefined}
				>
					{children}
				</Link>
			</SheetClose>
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
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string should also be treated as missing
	const firstName = session.user.name?.split(" ")[0] || null;
	const greeting = firstName ? `Bonjour ${firstName}` : "Bonjour";
	const labelSubject = firstName ?? "bienvenue";

	return (
		<div className="bg-primary/5 mb-4 rounded-xl p-4">
			<SheetClose asChild>
				<Link
					href={ROUTES.ACCOUNT.ROOT}
					prefetch={null}
					className="group block"
					aria-label={`Mon compte - ${labelSubject}${wishlistCount > 0 ? `, ${wishlistCount} favori${wishlistCount > 1 ? "s" : ""}` : ""}${cartCount > 0 ? `, ${cartCount} article${cartCount > 1 ? "s" : ""}` : ""}`}
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
							{wishlistCount === 0 && cartCount === 0 && <span>Mon espace personnel</span>}
						</p>
					</div>
				</Link>
			</SheetClose>
		</div>
	);
}

// --- Discover Section ---

interface DiscoverSectionProps extends SectionProps {
	homeItem?: { href: string; label: string };
	aboutItem?: { href: string; label: string };
}

export function DiscoverSection({
	homeItem,
	aboutItem,
	isMenuItemActive,
	itemVariants,
	delay,
}: DiscoverSectionProps) {
	if (!homeItem) return null;

	return (
		<section aria-labelledby="section-discover" className="mb-4">
			<SectionHeader id="section-discover">Découvrir</SectionHeader>
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

interface CollectionsSectionProps extends SectionProps {
	collections?: Array<{
		slug: string;
		label: string;
		images: CollectionImage[];
		createdAt?: Date;
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
					>
						{collection.label}
					</NavLink>
				))}
			</ul>
		</section>
	);
}

// --- Account Section ---

interface AccountSectionProps extends SectionProps {
	accountItem?: { href: string; label: string };
	favoritesItem?: { href: string; label: string };
	isLoggedIn: boolean;
	wishlistCount: number;
	onLogoutClick?: () => void;
}

export function AccountSection({
	accountItem,
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
			<SectionHeader id="section-account">{isLoggedIn ? "Mon compte" : "Compte"}</SectionHeader>
			<ul className="space-y-1">
				{/* Account link - adapts to session state */}
				{accountItem && (
					<NavLink
						href={accountItem.href}
						isMenuItemActive={isMenuItemActive}
						itemVariants={itemVariants}
						customDelay={delay(150, 0)}
					>
						{accountItem.label}
					</NavLink>
				)}

				{/* Favorites with badge count */}
				{favoritesItem && isLoggedIn && (
					<NavLink
						href={favoritesItem.href}
						isMenuItemActive={isMenuItemActive}
						itemVariants={itemVariants}
						customDelay={delay(150, 1)}
						className="justify-between"
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

				{/* Orders (logged in only) */}
				{isLoggedIn && (
					<NavLink
						href={ROUTES.ACCOUNT.ORDERS}
						isMenuItemActive={isMenuItemActive}
						itemVariants={itemVariants}
						customDelay={delay(150, 2)}
					>
						Mes commandes
					</NavLink>
				)}

				{/* Logout (logged in only) — closes menu before opening dialog */}
				{isLoggedIn && (
					<m.li variants={itemVariants} custom={delay(150, 3)}>
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

				{/* Sign up link for non-logged-in users */}
				{!isLoggedIn && (
					<NavLink
						href={ROUTES.AUTH.SIGN_UP}
						isMenuItemActive={isMenuItemActive}
						itemVariants={itemVariants}
						customDelay={delay(150, 1)}
						className="text-muted-foreground can-hover:hover:text-foreground"
						prefetch={null}
					>
						Créer un compte
					</NavLink>
				)}
			</ul>
		</section>
	);
}
