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
	Keyboard,
	LayoutDashboard,
	LogOut,
	Search,
	SearchX,
	X,
} from "lucide-react";
// `m` (et non `motion`) : l'app est enveloppée dans <LazyMotion> — importer
// `motion` embarque le bundle complet des features (~30 kB) en plus.
import { m, useReducedMotion } from "motion/react";
// GuardedLink : consulte le registre de NavigationGuardProvider avant de naviguer,
// pour ne pas perdre la saisie d'un formulaire admin dirty (cf. audit 2026-07-26).
import { GuardedLink as Link } from "@/shared/components/navigation/guarded-link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { KEYBOARD_SHORTCUTS_DIALOG_ID } from "./keyboard-shortcuts.constants";
import {
	ADMIN_MENU_SHEET_CONTENT_ID,
	badgeAriaLabel,
	getAllNavItems,
	navigationData,
} from "./navigation-config";

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
 * fournit le feedback visuel.
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
	const { open: openShortcuts } = useDialog(KEYBOARD_SHORTCUTS_DIALOG_ID);
	const [showLogout, setShowLogout] = useState(false);
	/**
	 * Action à exécuter APRÈS la fermeture du sheet. Généralisée depuis le seul cas
	 * « logout » : tout dialogue ouvert depuis le sheet doit attendre la fin de la
	 * transition Vaul, sinon les deux overlays se chevauchent et le scroll-lock du
	 * sheet sortant casse celui du dialogue entrant.
	 */
	const [pendingAction, setPendingAction] = useState<"logout" | "shortcuts" | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const searchInputRef = useRef<HTMLInputElement>(null);
	const navRef = useRef<HTMLElement>(null);
	const pathname = usePathname();
	const router = useRouter();
	const shouldReduceMotion = useReducedMotion();

	// Stagger léger des cartes de la vue par défaut (fade + slide-up 8px), no-op
	// si prefers-reduced-motion. Parité menu-sheet-nav.tsx storefront (delay 20ms/index).
	const fadeUp = (index: number) =>
		shouldReduceMotion
			? {}
			: {
					initial: { opacity: 0, y: 8 },
					animate: { opacity: 1, y: 0 },
					transition: {
						duration: 0.25,
						delay: (60 + index * 20) / 1000,
						ease: "easeOut" as const,
					},
				};

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
			// La garde shouldReduceMotion plus bas ne couvre que le TIMING — le
			// scroll lui-même doit aussi être instantané.
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- JSDOM ne polyfill pas scrollIntoView
			activePage?.scrollIntoView?.({
				block: "center",
				behavior: shouldReduceMotion ? "auto" : "smooth",
			});
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

	// Defer the pending dialog until Vaul finishes its exit transition. Écouter
	// transitionend (transform) sur sheet-content est plus robuste qu'un
	// setTimeout fixe — le fallback couvre prefers-reduced-motion (Vaul peut
	// court-circuiter la transition). Un seul sheet admin ouvert à la fois,
	// donc querySelector est sûr.
	useEffect(() => {
		if (!pendingAction || isOpen) return;
		const sheetContent = document.querySelector<HTMLElement>('[data-slot="sheet-content"]');
		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			sheetContent?.removeEventListener("transitionend", onEnd);
			if (pendingAction === "logout") setShowLogout(true);
			else openShortcuts();
			setPendingAction(null);
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
	}, [pendingAction, isOpen, openShortcuts]);

	function handleLogoutClick() {
		triggerHaptic("medium");
		setSearchQuery("");
		setPendingAction("logout");
		closeMenu();
	}

	function handleShortcutsClick() {
		triggerHaptic("light");
		setSearchQuery("");
		setPendingAction("shortcuts");
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

	// Total des files actionnables (commandes + remboursements) pour l'annonce
	// d'ouverture lecteur d'écran — surface l'info badge dès l'ouverture.
	const pendingTotal = Object.values(badges ?? {}).reduce((sum, n) => sum + n, 0);

	// Filter nav items when searching
	const filteredItems = isSearching
		? allNavItems.filter(
				(item) =>
					stripDiacritics(item.title).includes(normalizedQuery) ||
					(item.shortTitle && stripDiacritics(item.shortTitle).includes(normalizedQuery)),
			)
		: [];

	const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		// Entrée → navigue vers le 1er résultat filtré (gain mobile :
		// taper « comm » + Entrée → Commandes sans viser la cible).
		if (e.key !== "Enter") return;
		const first = filteredItems[0];
		if (!first) return;
		e.preventDefault();
		triggerHaptic("selection");
		setSearchQuery("");
		closeMenu();
		router.push(first.url);
	};

	return (
		<>
			<Sheet
				direction="bottom"
				open={isOpen}
				onOpenChange={handleOpenChange}
				// Sur iOS Safari, la search input prend le focus → clavier remonte sans
				// repositionner le contenu : input masqué. repositionInputs corrige.
				repositionInputs
				// Navigation longue et scrollable sur 92 dvh : un scroll vers le bas
				// depuis le haut de la liste fermait la sheet. La `SheetHandle` visible
				// reste le seul point de drag.
				handleOnly
			>
				<SheetContent
					id={ADMIN_MENU_SHEET_CONTENT_ID}
					className="bg-muted flex h-[92dvh] flex-col rounded-t-2xl border-t p-0!"
					overlayClassName="bg-black/50"
					showCloseButton={false}
					onOverlayClick={() => triggerHaptic("selection")}
					// Suspend l'auto-focus par défaut (qui ciblerait la search input →
					// pop clavier iOS). Le focus est appliqué après l'animation d'entrée
					// par l'effect [isOpen, shouldReduceMotion] (cf. supra).
					// `initialFocus={false}` remplace l'ancien `onOpenAutoFocus` + preventDefault.
					initialFocus={false}
				>
					<SheetHeader className="sr-only p-0!">
						<SheetTitle>Menu d&apos;administration</SheetTitle>
						<SheetDescription>Navigation du tableau de bord administrateur</SheetDescription>
					</SheetHeader>

					{/* Poignée de drag — affordance toujours draggable malgré le ScrollFade
					 * en dessous, sinon le swipe est intercepté par le scroll interne. */}
					<SheetHandle className="mt-3 mb-2" />

					{/* Live region d'ouverture : annonce le total d'options dispo aux
					 * lecteurs d'écran à chaque ouverture, masquée pendant la recherche
					 * pour ne pas concurrencer la live region des résultats. */}
					{isOpen && !isSearching && (
						<p role="status" aria-live="polite" className="sr-only">
							Menu ouvert, {allNavItems.length} option
							{allNavItems.length > 1 ? "s" : ""} de navigation
							{pendingTotal > 0
								? `, ${pendingTotal} élément${pendingTotal > 1 ? "s" : ""} à traiter`
								: ""}
						</p>
					)}

					{/* Search bar — filtre la liste des pages de navigation admin
					 * (titre + shortTitle, accent-insensitive). Ce n'est PAS une
					 * recherche de contenu : pour trouver une commande/produit/client,
					 * ouvrir la page concernée et utiliser sa recherche dédiée. */}
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
								// "go" si un résultat existe (Entrée navigue), sinon "done" ferme
								// juste le clavier (filtre live, pas de submit classique).
								enterKeyHint={isSearching && filteredItems.length > 0 ? "go" : "done"}
								data-base-ui-swipe-ignore=""
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								onKeyDown={handleSearchKeyDown}
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
										"text-muted-foreground/70 can-hover:hover:text-foreground absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full",
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
																		aria-label={badgeAriaLabel(item.id, badgeCount)}
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
										<m.div
											{...fadeUp(0)}
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
										</m.div>

										{/* Navigation groups — iOS Settings style */}
										{navigationData.navGroups.map((group, groupIndex) => (
											<m.div key={group.label} {...fadeUp(groupIndex + 1)} className="mb-3">
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
																			aria-label={badgeAriaLabel(item.id, badgeCount)}
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
											</m.div>
										))}

										{/* Actions card */}
										<m.ul
											role="list"
											{...fadeUp(navigationData.navGroups.length + 1)}
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
												>
													<ExternalLink
														className="text-muted-foreground size-5 shrink-0"
														aria-hidden="true"
													/>
													<span className="flex-1 text-sm font-medium">
														Voir le site
														<span className="sr-only"> (ouvre dans un nouvel onglet)</span>
													</span>
													<ChevronRight
														className="text-muted-foreground/50 size-4 shrink-0"
														aria-hidden="true"
													/>
												</Link>
											</li>
											{/* Aide raccourcis : le dialogue est monté globalement mais n'avait
											    AUCUNE affordance sous `md` — l'icône clavier vit dans le header
											    desktop, et `?` suppose de connaître le raccourci d'avance. Sur
											    tablette avec clavier, l'aide était donc indécouvrable. */}
											<li>
												<button
													type="button"
													onClick={handleShortcutsClick}
													aria-haspopup="dialog"
													className={cn(
														"border-border/60 active:bg-accent flex w-full items-center gap-3 border-b px-4 py-3 transition-colors",
														NAV_ITEM_TACTILE_CLASS,
													)}
												>
													<Keyboard
														className="text-muted-foreground size-5 shrink-0"
														aria-hidden="true"
													/>
													<span className="flex-1 text-left text-sm font-medium">
														Raccourcis clavier
													</span>
													<ChevronRight
														className="text-muted-foreground/50 size-4 shrink-0"
														aria-hidden="true"
													/>
												</button>
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
										</m.ul>
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
