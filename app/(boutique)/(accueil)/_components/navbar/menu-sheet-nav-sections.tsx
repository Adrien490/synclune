"use client";

import type { CollectionImage } from "@/modules/collections/types/collection.types";
import { Badge } from "@/shared/components/ui/badge";
import { SheetClose } from "@/shared/components/ui/sheet";
import { MAX_COLLECTIONS_IN_MENU } from "@/shared/constants/navigation";
import { ROUTES } from "@/shared/constants/urls";
import { cn } from "@/shared/utils/cn";
import { Gem } from "lucide-react";
import type { Variants } from "motion/react";
import { m } from "motion/react";
import Link from "next/link";
import { CollectionMiniGrid } from "./collection-mini-grid";
import { SectionHeader } from "./section-header";

// Shared link styles (must match menu-sheet-nav.tsx)
const linkClassName = cn(
	"flex items-center text-base/6 font-medium tracking-wide antialiased px-4 py-3.5 rounded-lg",
	"transition-[transform,color,background-color,padding] duration-300 ease-out",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
	"text-foreground/85 hover:text-foreground hover:bg-primary/5 hover:pl-5",
	"motion-safe:active:scale-[0.97]",
);

const activeLinkClassName = cn(
	linkClassName,
	"bg-primary/12 text-foreground font-semibold border-l-2 border-primary pl-5 shadow-sm",
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

// --- Discover Section ---

interface DiscoverSectionProps extends SectionProps {
	homeItem?: { href: string; label: string };
}

export function DiscoverSection({
	homeItem,
	isMenuItemActive,
	itemVariants,
	delay,
}: DiscoverSectionProps) {
	if (!homeItem) return null;

	return (
		<section aria-labelledby="section-discover" className="mb-4">
			<SectionHeader id="section-discover">Découvrir</SectionHeader>
			<ul className="space-y-1">
				<m.li variants={itemVariants} custom={delay(70, 0)}>
					<SheetClose asChild>
						<Link
							href={homeItem.href}
							className={getLinkClass(homeItem.href, isMenuItemActive)}
							aria-current={isMenuItemActive(homeItem.href) ? "page" : undefined}
						>
							{homeItem.label}
						</Link>
					</SheetClose>
				</m.li>
			</ul>
		</section>
	);
}

// --- Creations Section ---

interface CreationsSectionProps extends SectionProps {
	productTypes?: Array<{ slug: string; label: string }>;
	personalizationItem?: { href: string; label: string };
}

export function CreationsSection({
	productTypes,
	personalizationItem,
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
				<m.li variants={itemVariants} custom={delay(90, 0)}>
					<SheetClose asChild>
						<Link
							href={ROUTES.SHOP.PRODUCTS}
							className={getLinkClass(ROUTES.SHOP.PRODUCTS, isMenuItemActive, undefined, {
								exact: true,
							})}
							aria-current={
								isMenuItemActive(ROUTES.SHOP.PRODUCTS, { exact: true }) ? "page" : undefined
							}
						>
							Tous les bijoux
						</Link>
					</SheetClose>
				</m.li>
				{productTypes.map((type, i) => (
					<m.li key={type.slug} variants={itemVariants} custom={delay(90, i + 1)}>
						<SheetClose asChild>
							<Link
								href={ROUTES.SHOP.PRODUCT_TYPE(type.slug)}
								className={getLinkClass(ROUTES.SHOP.PRODUCT_TYPE(type.slug), isMenuItemActive)}
								aria-current={
									isMenuItemActive(ROUTES.SHOP.PRODUCT_TYPE(type.slug)) ? "page" : undefined
								}
							>
								{type.label}
							</Link>
						</SheetClose>
					</m.li>
				))}
				{personalizationItem && (
					<m.li variants={itemVariants} custom={delay(90, productTypes.length + 1)}>
						<SheetClose asChild>
							<Link
								href={personalizationItem.href}
								className={getLinkClass(personalizationItem.href, isMenuItemActive)}
								aria-current={isMenuItemActive(personalizationItem.href) ? "page" : undefined}
							>
								{personalizationItem.label}
							</Link>
						</SheetClose>
					</m.li>
				)}
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
				<m.li variants={itemVariants} custom={delay(110, 0)}>
					<SheetClose asChild>
						<Link
							href={ROUTES.SHOP.COLLECTIONS}
							className={getLinkClass(ROUTES.SHOP.COLLECTIONS, isMenuItemActive, undefined, {
								exact: true,
							})}
							aria-current={
								isMenuItemActive(ROUTES.SHOP.COLLECTIONS, { exact: true }) ? "page" : undefined
							}
						>
							Toutes les collections
						</Link>
					</SheetClose>
				</m.li>
				{displayedCollections.map((collection, i) => (
					<m.li key={collection.slug} variants={itemVariants} custom={delay(110, i + 1)}>
						<SheetClose asChild>
							<Link
								href={ROUTES.SHOP.COLLECTION(collection.slug)}
								className={getLinkClass(
									ROUTES.SHOP.COLLECTION(collection.slug),
									isMenuItemActive,
									"gap-3",
								)}
								aria-current={
									isMenuItemActive(ROUTES.SHOP.COLLECTION(collection.slug)) ? "page" : undefined
								}
							>
								{collection.images.length > 0 ? (
									<CollectionMiniGrid images={collection.images} />
								) : (
									<div
										className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-lg"
										aria-hidden="true"
									>
										<Gem className="text-primary/40 h-5 w-5" />
									</div>
								)}
								<span className="flex-1">{collection.label}</span>
							</Link>
						</SheetClose>
					</m.li>
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
					<m.li variants={itemVariants} custom={delay(150, 0)}>
						<SheetClose asChild>
							<Link
								href={accountItem.href}
								className={getLinkClass(accountItem.href, isMenuItemActive)}
								aria-current={isMenuItemActive(accountItem.href) ? "page" : undefined}
							>
								{accountItem.label}
							</Link>
						</SheetClose>
					</m.li>
				)}

				{/* Favorites with badge count */}
				{favoritesItem && isLoggedIn && (
					<m.li variants={itemVariants} custom={delay(150, 1)}>
						<SheetClose asChild>
							<Link
								href={favoritesItem.href}
								className={getLinkClass(favoritesItem.href, isMenuItemActive, "justify-between")}
								aria-current={isMenuItemActive(favoritesItem.href) ? "page" : undefined}
								aria-label={
									wishlistCount > 0 ? `${favoritesItem.label} (${wishlistCount})` : undefined
								}
							>
								{favoritesItem.label}
								{wishlistCount > 0 && (
									<Badge variant="secondary" className="px-1.5 py-0 text-xs">
										{wishlistCount}
									</Badge>
								)}
							</Link>
						</SheetClose>
					</m.li>
				)}

				{/* Orders (logged in only) */}
				{isLoggedIn && (
					<m.li variants={itemVariants} custom={delay(150, 2)}>
						<SheetClose asChild>
							<Link
								href={ROUTES.ACCOUNT.ORDERS}
								className={getLinkClass(ROUTES.ACCOUNT.ORDERS, isMenuItemActive)}
								aria-current={isMenuItemActive(ROUTES.ACCOUNT.ORDERS) ? "page" : undefined}
							>
								Mes commandes
							</Link>
						</SheetClose>
					</m.li>
				)}

				{/* Logout (logged in only) — closes menu before opening dialog */}
				{isLoggedIn && (
					<m.li variants={itemVariants} custom={delay(150, 3)}>
						<button
							type="button"
							className={cn(
								linkClassName,
								"text-muted-foreground hover:text-foreground w-full text-left",
							)}
							onClick={onLogoutClick}
						>
							Déconnexion
						</button>
					</m.li>
				)}

				{/* Sign up link for non-logged-in users */}
				{!isLoggedIn && (
					<m.li variants={itemVariants} custom={delay(150, 1)}>
						<SheetClose asChild>
							<Link
								href={ROUTES.AUTH.SIGN_UP}
								className={getLinkClass(
									ROUTES.AUTH.SIGN_UP,
									isMenuItemActive,
									"text-muted-foreground hover:text-foreground",
								)}
								aria-current={isMenuItemActive(ROUTES.AUTH.SIGN_UP) ? "page" : undefined}
							>
								Créer un compte
							</Link>
						</SheetClose>
					</m.li>
				)}
			</ul>
		</section>
	);
}
