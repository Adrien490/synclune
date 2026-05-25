"use client";

import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import ScrollFade from "@/shared/components/scroll-fade";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHandle,
	SheetHeader,
	SheetTitle,
} from "@/shared/components/ui/sheet";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { isRouteActive } from "@/shared/lib/navigation";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import {
	ChevronRight,
	ExternalLink,
	LayoutDashboard,
	LogOut,
	Search,
	SearchX,
	X,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ADMIN_MENU_SHEET_CONTENT_ID, getAllNavItems, navigationData } from "./navigation-config";

interface AdminMenuSheetProps {
	user: {
		name: string;
		email: string;
	};
	badges?: Record<string, number>;
}

const allNavItems = getAllNavItems();

/**
 * Durée approximative de l'animation de sortie Vaul (transform slide-out).
 * Utilisée comme fallback timer pour différer l'ouverture du LogoutAlertDialog
 * jusqu'à ce que la sheet ait fini sa transition — évite les conflits
 * focus-trap / aria-hidden entre overlays superposés. Source : défauts Vaul
 * (~300 ms) + marge. Parité avec menu-sheet storefront.
 */
const VAUL_EXIT_DURATION_MS = 450;

/**
 * Classes tactiles communes à tous les Links de navigation du menu :
 * touch-manipulation supprime le 300 ms delay tap mobile, scale active
 * fournit le feedback visuel (parité admin-menu-quick-access.tsx:33).
 * focus-ring (app/globals.css:17) = SSOT anneau focus clavier WCAG 2.4.7.
 */
const NAV_ITEM_TACTILE_CLASS =
	"touch-manipulation motion-safe:active:scale-[0.97] [-webkit-tap-highlight-color:transparent] focus-ring";

function handleNavClick() {
	triggerHaptic("selection");
}

const stripDiacritics = (s: string) =>
	s
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();

export function AdminMenuSheet({ user, badges }: AdminMenuSheetProps) {
	const { isOpen, open: openMenu, close: closeMenu } = useDialog("admin-menu-sheet");
	const [showLogout, setShowLogout] = useState(false);
	const [pendingLogout, setPendingLogout] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const searchInputRef = useRef<HTMLInputElement>(null);
	const navRef = useRef<HTMLElement>(null);
	const pathname = usePathname();
	const shouldReduceMotion = useReducedMotion();

	// Close on navigation
	useEffect(() => {
		if (isOpen) closeMenu();
	}, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

	// Focus management à l'ouverture (WCAG 2.4.3 + parité menu-sheet-nav.tsx:77-114).
	// Vaul/Radix auto-focuse le 1er élément focusable du portal — la search input —
	// ce qui pop le clavier iOS sur ouverture. `onOpenAutoFocus` preventDefault
	// suspend ce comportement ; on applique notre propre focus après l'animation
	// d'entrée : scroll l'item actif au centre puis focus le 1er lien du nav.
	useEffect(() => {
		if (!isOpen) return;
		const nav = navRef.current;
		if (!nav) return;

		function applyFocus() {
			const n = navRef.current;
			if (!n) return;
			const activePage = n.querySelector<HTMLElement>('[aria-current="page"]');
			// scrollIntoView est typé non-optionnel mais absent de JSDOM —
			// `?.()` garde l'environnement de test sain (TypeScript narrow OK).
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- JSDOM ne polyfill pas scrollIntoView
			activePage?.scrollIntoView?.({ block: "center", behavior: "smooth" });
			n.querySelector<HTMLAnchorElement>("a")?.focus();
		}

		if (shouldReduceMotion) {
			applyFocus();
			return;
		}

		const sheetContent = nav.closest<HTMLElement>('[data-slot="sheet-content"]');
		if (!sheetContent) {
			applyFocus();
			return;
		}

		const onTransitionEnd = (event: TransitionEvent) => {
			if (event.propertyName !== "transform" || event.target !== sheetContent) return;
			applyFocus();
			sheetContent.removeEventListener("transitionend", onTransitionEnd);
		};

		sheetContent.addEventListener("transitionend", onTransitionEnd);
		const fallback = window.setTimeout(applyFocus, VAUL_EXIT_DURATION_MS);
		return () => {
			sheetContent.removeEventListener("transitionend", onTransitionEnd);
			clearTimeout(fallback);
		};
	}, [isOpen, shouldReduceMotion]);

	// Defer LogoutAlertDialog until Vaul finishes its exit transition. Écouter
	// transitionend (transform) sur sheet-content est plus robuste qu'un
	// setTimeout fixe — le fallback couvre prefers-reduced-motion (Vaul peut
	// court-circuiter la transition). Un seul sheet admin ouvert à la fois,
	// donc querySelector est sûr.
	useEffect(() => {
		if (!pendingLogout || isOpen) return;
		const sheetContent = document.querySelector<HTMLElement>('[data-slot="sheet-content"]');
		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			sheetContent?.removeEventListener("transitionend", onEnd);
			setPendingLogout(false);
			setShowLogout(true);
		};
		const onEnd = (event: TransitionEvent) => {
			if (event.propertyName === "transform" && event.target === sheetContent) finish();
		};
		sheetContent?.addEventListener("transitionend", onEnd);
		const fallback = window.setTimeout(finish, VAUL_EXIT_DURATION_MS);
		return () => {
			sheetContent?.removeEventListener("transitionend", onEnd);
			clearTimeout(fallback);
		};
	}, [pendingLogout, isOpen]);

	function handleLogoutClick() {
		triggerHaptic("medium");
		setSearchQuery("");
		setPendingLogout(true);
		closeMenu();
	}

	function handleOpenChange(open: boolean) {
		if (open) {
			setSearchQuery("");
			triggerHaptic("light");
			openMenu();
		} else {
			triggerHaptic("selection");
			closeMenu();
			setSearchQuery("");
			// No programmatic focus restoration: sheet is mobile-only (md:hidden),
			// and .focus() on the trigger re-activates :focus-visible in Chromium
			// after tap-driven close, leaving a visible ring.
		}
	}

	const isDashboardActive = pathname === "/admin";
	// When the sheet is closed via navigation (effect), the query resets on next open via handleOpenChange.
	// Normalisation accent-insensitive : "materiaux" matche "Matériaux", etc.
	const normalizedQuery = stripDiacritics((isOpen ? searchQuery : "").trim());
	const isSearching = normalizedQuery.length > 0;

	// Filter nav items when searching
	const filteredItems = isSearching
		? allNavItems.filter(
				(item) =>
					stripDiacritics(item.title).includes(normalizedQuery) ||
					(item.shortTitle && stripDiacritics(item.shortTitle).includes(normalizedQuery)),
			)
		: [];

	return (
		<>
			<Sheet
				direction="bottom"
				open={isOpen}
				onOpenChange={handleOpenChange}
				preventScrollRestoration
				scrollLockTimeout={500}
				// Sur iOS Safari, la search input prend le focus → clavier remonte sans
				// repositionner le contenu Vaul : input masqué. repositionInputs corrige.
				repositionInputs
			>
				<SheetContent
					id={ADMIN_MENU_SHEET_CONTENT_ID}
					className="bg-muted flex h-[92dvh] flex-col rounded-t-2xl border-t p-0!"
					overlayClassName="bg-black/50"
					showCloseButton={false}
					onOverlayClick={() => triggerHaptic("selection")}
					// Suspend l'auto-focus Radix par défaut (qui cible la search input
					// → pop clavier iOS). Le focus est appliqué après l'animation
					// d'entrée par l'effect [isOpen, shouldReduceMotion] (cf. supra).
					onOpenAutoFocus={(e) => e.preventDefault()}
				>
					<SheetHeader className="sr-only p-0!">
						<SheetTitle>Menu d&apos;administration</SheetTitle>
						<SheetDescription>Navigation du tableau de bord administrateur</SheetDescription>
					</SheetHeader>

					{/* Drag handle Vaul — affordance toujours draggable malgré le ScrollFade
					 * en dessous, sinon le swipe est intercepté par le scroll interne. */}
					<SheetHandle className="mt-3 mb-2" />

					{/* Live region d'ouverture : annonce le total d'options dispo aux
					 * lecteurs d'écran à chaque ouverture, masquée pendant la recherche
					 * pour ne pas concurrencer la live region des résultats. */}
					{isOpen && !isSearching && (
						<p role="status" aria-live="polite" className="sr-only">
							Menu ouvert, {allNavItems.length} option
							{allNavItems.length > 1 ? "s" : ""} de navigation
						</p>
					)}

					{/* Search bar — filtre uniquement les pages de navigation.
					 * Pour rechercher des commandes, produits, clients ou déclencher des
					 * actions rapides : utiliser la command palette (FAB Sparkles / Cmd+K). */}
					<div className="px-4 pb-2">
						<div className="relative">
							<Search
								className="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
								aria-hidden="true"
							/>
							<input
								ref={searchInputRef}
								type="search"
								inputMode="search"
								// "done" ferme le clavier mobile (pas de submit câblé : filtre live).
								enterKeyHint="done"
								data-vaul-no-drag
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Filtrer les pages…"
								aria-label="Filtrer les pages de navigation"
								className={cn(
									"bg-background/80 border-border/60 placeholder:text-muted-foreground/70",
									"flex h-11 w-full rounded-xl border py-2 pl-9 text-sm",
									// pr-11 quand le bouton clear est visible, pr-3 sinon — évite que
									// le texte de la requête passe sous l'icône.
									searchQuery.length > 0 ? "pr-11" : "pr-3",
									// SSOT focus-ring (globals.css:17). Suppression du cancel X natif
									// iOS Safari (sinon double X avec le clear button explicite).
									"focus-ring",
									"[&::-webkit-search-cancel-button]:appearance-none",
									"motion-safe:transition-colors",
								)}
							/>
							{searchQuery.length > 0 && (
								<button
									type="button"
									onClick={() => {
										triggerHaptic("light");
										setSearchQuery("");
										searchInputRef.current?.focus();
									}}
									aria-label="Effacer la recherche"
									className={cn(
										"text-muted-foreground/70 hover:text-foreground absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full",
										"touch-manipulation [-webkit-tap-highlight-color:transparent] motion-safe:active:scale-[0.92]",
										"focus-ring",
									)}
								>
									<X className="size-4" aria-hidden="true" />
								</button>
							)}
						</div>
					</div>

					{/* Scrollable content — ScrollFade porte le scroll, fade top/bottom
					 * indique affordance de scroll sur iOS-like hidden scrollbar.
					 * fadeFromClass="from-muted" matche le fond du sheet (bg-muted). */}
					<div className="min-h-0 flex-1">
						<ScrollFade axis="vertical" fadeFromClass="from-muted" className="overscroll-contain">
							<nav
								ref={navRef}
								aria-label="Navigation administration"
								className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
							>
								{isSearching ? (
									/* Search results — flat list */
									<div
										className="bg-background overflow-hidden rounded-xl border"
										role="region"
										aria-label={`${filteredItems.length} résultat${filteredItems.length > 1 ? "s" : ""} de navigation`}
									>
										{/* sr-only live region: announce result count changes to screen readers */}
										<div className="sr-only" role="status" aria-live="polite">
											{filteredItems.length === 0
												? `Aucun résultat pour « ${searchQuery} »`
												: `${filteredItems.length} résultat${filteredItems.length > 1 ? "s" : ""} de navigation`}
										</div>
										{filteredItems.length === 0 ? (
											<div className="flex flex-col items-center gap-3 px-4 py-8">
												<SearchX className="text-muted-foreground/40 size-8" aria-hidden="true" />
												<p className="text-muted-foreground text-center text-sm">
													Aucun résultat pour &laquo;&nbsp;{searchQuery}&nbsp;&raquo;
												</p>
											</div>
										) : (
											// role="list" explicite : iOS Safari + VO retire le rôle implicite
											// quand list-style:none (reset Tailwind). Cf. cart-sheet-item-row-audit-2026-05-24.
											// eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none
											<ul role="list">
												{filteredItems.map((item, i) => {
													const isActive = isRouteActive(pathname, item.url);
													const badgeCount = badges?.[item.id];
													const isLast = i === filteredItems.length - 1;

													return (
														<li key={item.id}>
															<Link
																href={item.url}
																prefetch={null}
																onClick={handleNavClick}
																className={cn(
																	"flex items-center gap-3 px-4 py-3 transition-colors",
																	"active:bg-accent",
																	NAV_ITEM_TACTILE_CLASS,
																	isActive && "bg-accent",
																	!isLast && "border-border/60 border-b",
																)}
																aria-current={isActive ? "page" : undefined}
															>
																<item.icon
																	className={cn(
																		"size-5 shrink-0",
																		isActive ? "text-foreground" : "text-muted-foreground",
																	)}
																	aria-hidden="true"
																/>
																<span
																	className={cn(
																		"flex-1 text-sm font-medium",
																		isActive && "font-semibold",
																	)}
																>
																	{item.title}
																</span>
																{badgeCount != null && badgeCount > 0 && (
																	<span
																		className="bg-primary text-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold"
																		aria-label={`${badgeCount} en attente`}
																	>
																		{badgeCount > 99 ? "99+" : badgeCount}
																	</span>
																)}
																<ChevronRight
																	className="text-muted-foreground/50 size-4 shrink-0"
																	aria-hidden="true"
																/>
															</Link>
														</li>
													);
												})}
											</ul>
										)}
									</div>
								) : (
									/* Default view — grouped cards */
									<>
										{/* User card */}
										<div className="bg-background mb-3 overflow-hidden rounded-xl border">
											<div className="px-4 py-3">
												<p className="truncate text-sm font-semibold">{user.name}</p>
												<p className="text-muted-foreground truncate text-xs">{user.email}</p>
											</div>
										</div>

										{/* Dashboard — standalone prominent card */}
										<div
											className={cn(
												"bg-background mb-3 overflow-hidden rounded-xl border",
												isDashboardActive && "ring-border ring-2",
											)}
										>
											<Link
												href="/admin"
												prefetch={null}
												onClick={handleNavClick}
												className={cn(
													"flex items-center gap-3 px-4 py-3.5 transition-colors",
													"active:bg-accent",
													NAV_ITEM_TACTILE_CLASS,
													isDashboardActive && "bg-accent",
												)}
												aria-current={isDashboardActive ? "page" : undefined}
											>
												<div
													className={cn(
														"flex size-9 shrink-0 items-center justify-center rounded-lg",
														isDashboardActive
															? "bg-foreground text-background"
															: "bg-muted text-muted-foreground",
													)}
												>
													<LayoutDashboard className="size-5" aria-hidden="true" />
												</div>
												<div className="min-w-0 flex-1">
													<span
														className={cn(
															"text-sm font-medium",
															isDashboardActive && "font-semibold",
														)}
													>
														Tableau de bord
													</span>
													<p className="text-muted-foreground text-xs">Vue d&apos;ensemble</p>
												</div>
												<ChevronRight
													className="text-muted-foreground/50 size-4 shrink-0"
													aria-hidden="true"
												/>
											</Link>
										</div>

										{/* Navigation groups — iOS Settings style */}
										{navigationData.navGroups.map((group) => (
											<div key={group.label} className="mb-3">
												<p className="text-muted-foreground mb-1 px-1 text-xs font-medium">
													{group.label}
												</p>
												{/* role="list" explicite : iOS Safari + VO retire le rôle implicite
												 * sous list-style:none (reset Tailwind). */}
												{/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none */}
												<ul role="list" className="bg-background overflow-hidden rounded-xl border">
													{group.items.map((item, itemIndex) => {
														const isActive = isRouteActive(pathname, item.url);
														const badgeCount = badges?.[item.id];
														const isLast = itemIndex === group.items.length - 1;

														return (
															<li key={item.id}>
																<Link
																	href={item.url}
																	prefetch={null}
																	onClick={handleNavClick}
																	className={cn(
																		"flex items-center gap-3 px-4 py-3 transition-colors",
																		"active:bg-accent",
																		NAV_ITEM_TACTILE_CLASS,
																		isActive && "bg-accent",
																		!isLast && "border-border/60 border-b",
																	)}
																	aria-current={isActive ? "page" : undefined}
																>
																	<item.icon
																		className={cn(
																			"size-5 shrink-0",
																			isActive ? "text-foreground" : "text-muted-foreground",
																		)}
																		aria-hidden="true"
																	/>
																	<span
																		className={cn(
																			"flex-1 text-sm font-medium",
																			isActive && "font-semibold",
																		)}
																	>
																		{item.shortTitle ?? item.title}
																	</span>
																	{badgeCount != null && badgeCount > 0 && (
																		<span
																			className="bg-primary text-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold"
																			aria-label={`${badgeCount} en attente`}
																		>
																			{badgeCount > 99 ? "99+" : badgeCount}
																		</span>
																	)}
																	<ChevronRight
																		className="text-muted-foreground/50 size-4 shrink-0"
																		aria-hidden="true"
																	/>
																</Link>
															</li>
														);
													})}
												</ul>
											</div>
										))}

										{/* Actions card */}
										{/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none */}
										<ul
											role="list"
											className="bg-background mt-1 overflow-hidden rounded-xl border"
										>
											<li>
												<Link
													href="/"
													prefetch={false}
													target="_blank"
													rel="noopener noreferrer"
													onClick={handleNavClick}
													className={cn(
														"border-border/60 active:bg-accent flex items-center gap-3 border-b px-4 py-3 transition-colors",
														NAV_ITEM_TACTILE_CLASS,
													)}
													aria-label="Voir le site (nouvel onglet)"
												>
													<ExternalLink
														className="text-muted-foreground size-5 shrink-0"
														aria-hidden="true"
													/>
													<span className="flex-1 text-sm font-medium">Voir le site</span>
													<ChevronRight
														className="text-muted-foreground/50 size-4 shrink-0"
														aria-hidden="true"
													/>
												</Link>
											</li>
											<li>
												<button
													type="button"
													onClick={handleLogoutClick}
													aria-haspopup="dialog"
													className={cn(
														// active:bg-destructive/10 (vs nav links en active:bg-accent) — feedback
														// visuel cohérent avec la sémantique destructive (icône+label text-destructive).
														"active:bg-destructive/10 flex w-full items-center gap-3 px-4 py-3 transition-colors",
														NAV_ITEM_TACTILE_CLASS,
													)}
												>
													<LogOut className="text-destructive size-5 shrink-0" aria-hidden="true" />
													<span className="text-destructive flex-1 text-left text-sm font-medium">
														Déconnexion
													</span>
												</button>
											</li>
										</ul>
									</>
								)}
							</nav>
						</ScrollFade>
					</div>
				</SheetContent>
			</Sheet>

			{/* Rendu hors du Sheet pour éviter overlays empilés / focus-trap
			 * concurrents : l'AlertDialog n'apparaît qu'après que la sheet a
			 * terminé sa transition de sortie (cf. useEffect transitionend). */}
			<LogoutAlertDialog open={showLogout} onOpenChange={setShowLogout} />
		</>
	);
}
