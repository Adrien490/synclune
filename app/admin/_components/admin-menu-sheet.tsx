"use client";

import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import ScrollFade from "@/shared/components/scroll-fade";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/shared/components/ui/sheet";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { isRouteActive } from "@/shared/lib/navigation";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { ChevronRight, ExternalLink, LayoutDashboard, LogOut, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getAllNavItems, navigationData } from "./navigation-config";

/** Snap-points iOS-like : peek (50%) puis fullscreen (92%).
 * fadeFromIndex=1 → l'overlay ne fade-in qu'au passage en fullscreen,
 * cohérent avec le pattern Vaul Settings d'iOS. */
const MOBILE_SNAP_POINTS: (number | string)[] = [0.5, 0.92];

interface AdminMenuSheetProps {
	user: {
		name: string;
		email: string;
	};
	badges?: Record<string, number>;
}

const allNavItems = getAllNavItems();

export function AdminMenuSheet({ user, badges }: AdminMenuSheetProps) {
	const { isOpen, open: openMenu, close: closeMenu } = useDialog("admin-menu-sheet");
	const [showLogout, setShowLogout] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const isMobile = useIsMobile();
	const pathname = usePathname();
	const navRef = useRef<HTMLElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Close on navigation
	useEffect(() => {
		if (isOpen) closeMenu();
	}, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

	// Focus management : scroll vers l'élément actif (pattern iOS Settings).
	// Pas d'autofocus search input — anti-pattern mobile (clavier virtuel
	// s'ouvre à chaque tap Menu, intention nav ≠ recherche). Si l'utilisateur
	// veut filtrer, il tape la search bar lui-même.
	// Double rAF garantit que le drawer Vaul a fini son layout initial avant
	// scrollIntoView (évite scroll mal-placé pendant l'animation slide-in).
	useEffect(() => {
		if (!isOpen || !navRef.current) return;

		let cancelled = false;
		const rafId = requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				if (cancelled || !navRef.current) return;
				const activeLink = navRef.current.querySelector<HTMLAnchorElement>('[aria-current="page"]');
				activeLink?.scrollIntoView({ block: "nearest", behavior: "smooth" });
			});
		});

		return () => {
			cancelled = true;
			cancelAnimationFrame(rafId);
		};
	}, [isOpen]);

	function handleLogoutClick() {
		setSearchQuery("");
		setShowLogout(true);
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
	// When the sheet is closed via navigation (effect), the query resets on next open via handleOpenChange
	const normalizedQuery = (isOpen ? searchQuery : "").trim().toLowerCase();
	const isSearching = normalizedQuery.length > 0;

	// Filter nav items when searching
	const filteredItems = isSearching
		? allNavItems.filter(
				(item) =>
					item.title.toLowerCase().includes(normalizedQuery) ||
					(item.shortTitle && item.shortTitle.toLowerCase().includes(normalizedQuery)),
			)
		: [];

	// Vaul Root is a discriminated union: snapPoints requires fadeFromIndex
	// (WithFadeFromProps), absence of both is also valid (WithoutFadeFromProps).
	// Spread conditionally to satisfy the discriminated type.
	const snapProps = isMobile ? { snapPoints: MOBILE_SNAP_POINTS, fadeFromIndex: 1 } : {};

	return (
		<Sheet
			direction="bottom"
			open={isOpen}
			onOpenChange={handleOpenChange}
			preventScrollRestoration
			{...snapProps}
		>
			<SheetContent
				className="bg-muted flex h-[92dvh] flex-col rounded-t-2xl border-t p-0!"
				overlayClassName="bg-black/50"
				showCloseButton={false}
				onOverlayClick={() => triggerHaptic("selection")}
			>
				<SheetHeader className="sr-only p-0!">
					<SheetTitle>Menu d&apos;administration</SheetTitle>
					<SheetDescription>Navigation du tableau de bord administrateur</SheetDescription>
				</SheetHeader>

				{/* Drag handle */}
				<div
					className="bg-muted-foreground/25 mx-auto mt-3 mb-2 h-1.5 w-10 shrink-0 rounded-full"
					aria-hidden="true"
				/>

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
							enterKeyHint="search"
							data-vaul-no-drag
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Filtrer les pages…"
							aria-label="Filtrer les pages de navigation"
							className={cn(
								"bg-background/80 border-border/60 placeholder:text-muted-foreground/50",
								"flex h-11 w-full rounded-xl border py-2 pr-3 pl-9 text-sm",
								"focus-visible:ring-primary/30 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:outline-none",
								"motion-safe:transition-colors",
							)}
						/>
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
											? `Aucun résultat pour ${searchQuery}`
											: `${filteredItems.length} résultat${filteredItems.length > 1 ? "s" : ""}`}
									</div>
									{filteredItems.length === 0 ? (
										<p className="text-muted-foreground px-4 py-6 text-center text-sm">
											Aucun resultat pour &laquo;&nbsp;{searchQuery}&nbsp;&raquo;
										</p>
									) : (
										filteredItems.map((item, i) => {
											const isActive = isRouteActive(pathname, item.url);
											const badgeCount = badges?.[item.id];
											const isLast = i === filteredItems.length - 1;

											return (
												<Link
													key={item.id}
													href={item.url}
													className={cn(
														"flex items-center gap-3 px-4 py-3 transition-colors",
														"active:bg-accent",
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
											);
										})
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
											className={cn(
												"flex items-center gap-3 px-4 py-3.5 transition-colors",
												"active:bg-accent",
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
											<div className="bg-background overflow-hidden rounded-xl border">
												{group.items.map((item, itemIndex) => {
													const isActive = isRouteActive(pathname, item.url);
													const badgeCount = badges?.[item.id];
													const isLast = itemIndex === group.items.length - 1;

													return (
														<Link
															key={item.id}
															href={item.url}
															className={cn(
																"flex items-center gap-3 px-4 py-3 transition-colors",
																"active:bg-accent",
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
													);
												})}
											</div>
										</div>
									))}

									{/* Actions card */}
									<div className="bg-background mt-1 overflow-hidden rounded-xl border">
										<Link
											href="/"
											target="_blank"
											rel="noopener noreferrer"
											className="border-border/60 active:bg-accent flex items-center gap-3 border-b px-4 py-3 transition-colors"
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
										<button
											type="button"
											onClick={handleLogoutClick}
											className="active:bg-accent flex w-full items-center gap-3 px-4 py-3 transition-colors"
										>
											<LogOut className="text-destructive size-5 shrink-0" aria-hidden="true" />
											<span className="text-destructive flex-1 text-left text-sm font-medium">
												Deconnexion
											</span>
										</button>
									</div>
								</>
							)}
						</nav>
					</ScrollFade>
				</div>
			</SheetContent>
			<LogoutAlertDialog open={showLogout} onOpenChange={setShowLogout} />
		</Sheet>
	);
}
