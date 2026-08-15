"use client";

import { LogoutAlertDialog } from "@/modules/admin-auth/components/logout-alert-dialog";
import { SquiggleUnderline } from "@/shared/components/squiggle-underline";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetHandle,
	SheetHeader,
	SheetTitle,
} from "@/shared/components/ui/sheet";
import { ROUTES } from "@/shared/constants/urls";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { isRouteActive } from "@/shared/lib/navigation";
import { useDialog } from "@/shared/providers/overlay-store-provider";
import { cn } from "@/shared/utils/cn";
import {
	ArrowSquareOutIcon,
	CaretRightIcon,
	CheckCircleIcon,
	KeyboardIcon,
	MagnifyingGlassIcon,
	MagnifyingGlassMinusIcon,
	SignOutIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
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
	getQueueItems,
	navigationData,
	queueLabel,
	type NavItem,
} from "./navigation-config";

/** Props d'animation produites par `fadeUp` — `{}` sous prefers-reduced-motion. */
type FadeUpProps = Partial<React.ComponentProps<typeof m.div>>;

interface AdminMenuSheetProps {
	user: {
		name: string;
		email: string;
	};
	badges?: Record<string, number>;
}

const allNavItems = getAllNavItems();
const queueItems = getQueueItems();

/**
 * Durée approximative de l'animation de sortie du panneau (transform slide-out).
 * Utilisée comme fallback timer pour différer l'ouverture du LogoutAlertDialog
 * jusqu'à ce que la sheet ait fini sa transition — évite les conflits
 * focus-trap / aria-hidden entre overlays superposés. Source : `PANEL_TRANSITION`
 * (300 ms) + marge. Parité avec menu-sheet storefront.
 */
const SHEET_EXIT_DURATION_MS = 450;

/**
 * Classes tactiles communes à tous les Links de navigation du menu :
 * touch-manipulation supprime le 300 ms delay tap mobile, scale active
 * fournit le feedback visuel.
 * focus-ring (app/globals.css) = SSOT anneau focus clavier WCAG 2.4.7.
 */
const NAV_ITEM_TACTILE_CLASS =
	"touch-manipulation motion-safe:active:scale-[0.97] [-webkit-tap-highlight-color:transparent] focus-ring";

/** Rangée de navigation — géométrie partagée par la liste filtrée et les groupes. */
const NAV_ROW_CLASS =
	"flex min-h-11 items-center gap-3 px-4 py-3 transition-colors active:bg-accent";

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
	 * transition, sinon les deux overlays se chevauchent et le scroll-lock du
	 * sheet sortant casse celui du dialogue entrant.
	 */
	const [pendingAction, setPendingAction] = useState<"logout" | "shortcuts" | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const searchInputRef = useRef<HTMLInputElement>(null);
	const navRef = useRef<HTMLElement>(null);
	const pathname = usePathname();
	const router = useRouter();
	const shouldReduceMotion = useReducedMotion();

	// Stagger léger des blocs de la vue par défaut (fade + slide-up 8px), no-op
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

	// Focus management à l'ouverture (WCAG 2.4.3 + parité menu-sheet-nav.tsx).
	// Base UI auto-focuse le 1er élément focusable du portal — le champ de filtre —
	// ce qui pop le clavier iOS sur ouverture. `initialFocus={false}` suspend ce
	// comportement ; on applique notre propre focus après l'animation d'entrée :
	// scroll l'item actif au centre puis focus le 1er élément actionnable du nav.
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
			// `a, button` et non `a` seul : les groupes sont repliés par défaut, donc
			// le premier élément actionnable du nav est souvent un DÉCLENCHEUR de
			// groupe. Cibler `a` seul faisait sauter le focus jusqu'à « Voir le site »,
			// tout en bas, quand aucune file n'était en attente.
			n.querySelector<HTMLElement>("a, button")?.focus();
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
		const fallback = window.setTimeout(applyFocus, SHEET_EXIT_DURATION_MS);
		return () => {
			sheetContent.removeEventListener("transitionend", onTransitionEnd);
			clearTimeout(fallback);
		};
	}, [isOpen, shouldReduceMotion]);

	// Defer the pending dialog until the sheet finishes its exit transition. Écouter
	// transitionend (transform) sur sheet-content est plus robuste qu'un
	// setTimeout fixe — le fallback couvre prefers-reduced-motion (la transition
	// peut être court-circuitée). Un seul sheet admin ouvert à la fois,
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
		const fallback = window.setTimeout(finish, SHEET_EXIT_DURATION_MS);
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

	// When the sheet is closed via navigation (effect), the query resets on next open via handleOpenChange.
	// Normalisation accent-insensitive : "materiaux" matche "Matériaux", etc.
	const normalizedQuery = stripDiacritics((isOpen ? searchQuery : "").trim());
	const isSearching = normalizedQuery.length > 0;

	// ── L'ardoise : les files réellement actionnables ─────────────────────────
	// Dérivées des compteurs de `getAdminNavBadges`, dans l'ordre de la navigation.
	// Chaque ligne mène à `badgeUrl` — la file FILTRÉE, pas la liste complète.
	const queues = queueItems
		.map((item) => ({ item, count: badges?.[item.id] ?? 0 }))
		.filter(({ count }) => count > 0);
	const pendingTotal = queues.reduce((sum, q) => sum + q.count, 0);

	/**
	 * Annonce d'ouverture, dérivée PENDANT LE RENDU — pas dans un effet, et
	 * surtout pas dans un nœud monté avec son texte.
	 *
	 * La région vit HORS du `<Sheet>` : elle est donc montée en permanence, vide
	 * au premier rendu, et c'est le seul état qu'un lecteur d'écran vocalise
	 * ensuite. Montée à l'intérieur du portal, elle naissait avec son contenu et
	 * l'annonce ne partait probablement jamais — exactement le défaut corrigé sur
	 * la bottom bar admin le 2026-07-30 (`admin-mobile-bottom-bar.tsx`), dont la
	 * correction n'avait pas été reportée ici.
	 */
	const [prevOpen, setPrevOpen] = useState(isOpen);
	const [announcement, setAnnouncement] = useState("");
	if (prevOpen !== isOpen) {
		setPrevOpen(isOpen);
		setAnnouncement(
			isOpen
				? `Menu ouvert, ${allNavItems.length} option${allNavItems.length > 1 ? "s" : ""} de navigation` +
						(pendingTotal > 0
							? `, ${pendingTotal} élément${pendingTotal > 1 ? "s" : ""} à traiter`
							: "")
				: "",
		);
	}

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
				// Sur iOS Safari, le champ de filtre prend le focus → clavier remonte sans
				// repositionner le contenu : champ masqué. repositionInputs corrige.
				repositionInputs
				// Le mode « poignée seule » a été RETIRÉ le 2026-08-04 : le swipe
				// redevient possible depuis tout le contenu, et l'en-tête porte
				// désormais une sortie visible. Motif complet dans
				// `shared/components/ui/__tests__/handle-only-allowlist.regression.test.ts`,
				// qui scanne les call sites — ne pas y réécrire le nom de la prop, il
				// suffirait à faire échouer le garde-fou.
			>
				<SheetContent
					id={ADMIN_MENU_SHEET_CONTENT_ID}
					// Hauteur AUTO plafonnée, et non 92 dvh fixes : replié, ce menu tient
					// largement sous le plafond — un panneau de 776 px pour quatre
					// résultats de recherche était du vide payé au prix du pouce.
					// `flex-auto` sur la zone défilante (et non `flex-1`) : avec une
					// hauteur auto, `flex-basis: 0` ferait collapser la zone.
					className="bg-muted flex max-h-[92dvh] flex-col gap-0 rounded-t-2xl border-t p-0!"
					overlayClassName="bg-black/50"
					showCloseButton={false}
					onOverlayClick={() => triggerHaptic("selection")}
					// Suspend l'auto-focus par défaut (qui ciblerait le champ de filtre →
					// pop clavier iOS). Le focus est appliqué après l'animation d'entrée
					// par l'effect [isOpen, shouldReduceMotion] (cf. supra).
					initialFocus={false}
				>
					{/* Poignée de drag — repère visuel du geste, qui est de nouveau
					 * disponible depuis tout le panneau.
					 *
					 * ⚠️ Plus de `className="mt-3 mb-1"` : depuis le 2026-08-05 la poignée est
					 * une bande de préhension en flux qui porte son espacement en `py-3`. Les
					 * marges d'ici s'AJOUTAIENT au padding (24 px de marge + 24 px de padding)
					 * au lieu de le remplacer — elles reproduisaient l'ancien défaut, où le
					 * même espacement était déclaré des deux côtés. */}
					<SheetHandle />

					{/* En-tête VISIBLE. Il portait auparavant `sr-only` : combiné à
					 * `showCloseButton={false}` et à la bottom bar qui se dépublie à
					 * l'ouverture, le panneau n'avait plus AUCUNE sortie visible, et les
					 * deux cibles restantes (poignée, scrim) vivaient dans les 8 % hauts
					 * de l'écran — hors de portée du pouce sur un panneau ancré en bas. */}
					{/* `p-0` et NON `p-0!` : tailwind-merge conserve les deux groupes (`p-*` et
					 * `pt-*`/`pl-*`…), donc un `!important` sur le raccourci écraserait les
					 * paddings latéraux qui le suivent. Sans le `!`, la fusion retire bien
					 * le `p-4` de la primitive et les quatre côtés reprennent la main. */}
					<SheetHeader className="flex-row items-center gap-2 p-0 pt-1 pr-2 pb-2 pl-4">
						<div className="relative flex-1">
							<SheetTitle className="text-lg leading-tight">Menu</SheetTitle>
							{/* Le seul geste manuscrit de la surface : une fois, et pas trois. */}
							<SquiggleUnderline drawn className="-bottom-1 w-12" />
						</div>
						<SheetDescription className="sr-only">
							Files à traiter et navigation du tableau de bord administrateur
						</SheetDescription>
						{/* Fermeture par la primitive, jamais par `closeMenu()` en direct :
						 * un changement du prop contrôlé ne rejoue pas `onOpenChange`, donc
						 * l'entrée d'historique posée par `useBackButtonClose` resterait
						 * derrière (un « retour » mort par cycle, cumulatif). */}
						<SheetClose
							render={
								<button
									type="button"
									aria-label="Fermer le menu"
									className={cn(
										"text-muted-foreground can-hover:hover:text-foreground active:bg-accent inline-flex size-11 shrink-0 items-center justify-center rounded-full",
										"focus-ring touch-manipulation [-webkit-tap-highlight-color:transparent]",
									)}
								/>
							}
						>
							<XIcon className="size-5" aria-hidden="true" />
						</SheetClose>
					</SheetHeader>

					{/* Scrollable content — `scroll-fade-y` porte le fondu haut/bas, qui
					 * indique l'affordance de scroll sur barre masquée iOS-like.
					 * Plus de couleur à accorder au fond du sheet (`bg-muted`) : le fondu
					 * est un `mask-image`, il dissout le contenu au lieu de superposer un
					 * dégradé. Cf. `app/styles/scroll-fade.css`. */}
					<div className="min-h-0 flex-auto">
						<div
							data-slot="scroll-fade-container"
							className="scroll-fade-y no-scrollbar h-full overflow-x-hidden overflow-y-auto overscroll-contain"
						>
							<nav
								ref={navRef}
								aria-label="Navigation administration"
								// ⚠️ Ce `max()` est LOAD-BEARING, et il ne double PAS la
								// safe-area — contrairement à ce que la lecture des deux
								// fichiers laisse croire.
								//
								// La primitive pose bien `pb-[max(0px,env(safe-area-inset-bottom))]`
								// sur le popup ancré en bas, mais le `p-0!` de `SheetContent`
								// ci-dessus l'écrase (tailwind-merge garde les deux classes, et
								// `padding: 0 !important` l'emporte au rendu). Le seul retrait
								// bas effectif est donc celui-ci : le supprimer collerait
								// « Déconnexion » à la barre d'accueil de l'iPhone.
								//
								// Vérifié à la fusion, pas déduit : `twMerge` rend bien le
								// `pb-[…]` de la primitive et `p-0!` côte à côte.
								//
								// ⚠️ Ne JAMAIS abréger une classe arbitraire avec des points de
								// suspension dans un commentaire : Tailwind v4 scanne les fichiers
								// source sans distinguer code et commentaire, prend l'abréviation
								// pour un candidat, et génère une déclaration invalide qui fait
								// échouer le parsing de TOUTE la feuille — chaque page du site
								// répond alors 500 en dev. Écrire la classe en entier, ou ne pas
								// l'écrire.
								className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
							>
								{/* ── Ce qui t'attend ─────────────────────────────────────── */}
								<m.section {...fadeUp(0)} aria-labelledby="admin-menu-queues" className="mb-4">
									<p
										id="admin-menu-queues"
										className="text-muted-foreground mb-1.5 px-1 text-[11px] font-semibold tracking-[0.12em] uppercase"
									>
										Ce qui t&apos;attend
									</p>
									<QueueBoard queues={queues} onNavigate={handleNavClick} />
								</m.section>

								{/* ── Où aller ────────────────────────────────────────────── */}
								<p className="text-muted-foreground mb-1.5 px-1 text-[11px] font-semibold tracking-[0.12em] uppercase">
									Où aller
								</p>

								{/* Le champ de filtre reste AU-DESSUS de ce qu'il filtre et ne
								 * bouge jamais entre les deux vues : tout ce qui le précède est
								 * invariant. Ce n'est PAS une recherche de contenu — pour
								 * trouver une commande ou un produit, ouvrir la page concernée
								 * et utiliser sa recherche dédiée. */}
								<div className="relative mb-3">
									<MagnifyingGlassIcon
										className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
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
											"bg-background border-border",
											// Texte indicatif au token PLEIN : l'alpha /70 le faisait
											// tomber à 3,45:1 sur ce fond, sous les 4,5:1 d'AA, alors
											// que le token nu est à 7,23:1.
											"placeholder:text-muted-foreground",
											"flex h-11 w-full rounded-xl border py-2 pl-9 text-sm",
											// pr-11 quand le bouton clear est visible, pr-3 sinon — évite que
											// le texte de la requête passe sous l'icône.
											searchQuery.length > 0 ? "pr-11" : "pr-3",
											// SSOT focus-ring (globals.css). Suppression du cancel X natif
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
												"text-muted-foreground can-hover:hover:text-foreground absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full",
												"touch-manipulation [-webkit-tap-highlight-color:transparent] motion-safe:active:scale-[0.92]",
												"focus-ring",
											)}
										>
											<XIcon className="size-4" aria-hidden="true" />
										</button>
									)}
								</div>

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
												<MagnifyingGlassMinusIcon
													className="text-muted-foreground/40 size-8"
													aria-hidden="true"
												/>
												<p className="text-muted-foreground text-center text-sm">
													Aucun résultat pour &laquo;&nbsp;{searchQuery}&nbsp;&raquo;
												</p>
											</div>
										) : (
											// role="list" explicite : iOS Safari + VO retire le rôle implicite
											// quand list-style:none (reset Tailwind). Cf. cart-sheet-item-row-audit-2026-05-24.
											// eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none
											<ul role="list">
												{filteredItems.map((item, i) => (
													<li key={item.id}>
														<NavRow
															item={item}
															pathname={pathname}
															badgeCount={badges?.[item.id]}
															isLast={i === filteredItems.length - 1}
														/>
													</li>
												))}
											</ul>
										)}
									</div>
								) : (
									<>
										{navigationData.navGroups.map((group, groupIndex) => (
											<NavGroupRow
												key={group.label}
												group={group}
												pathname={pathname}
												badges={badges}
												motionProps={fadeUp(groupIndex + 1)}
											/>
										))}

										{/* Actions card */}
										<m.ul
											role="list"
											{...fadeUp(navigationData.navGroups.length + 1)}
											className="bg-background mt-4 overflow-hidden rounded-xl border"
										>
											<li>
												<Link
													href={ROUTES.SHOP.HOME}
													prefetch={false}
													target="_blank"
													rel="noopener noreferrer"
													onClick={handleNavClick}
													className={cn(
														NAV_ROW_CLASS,
														NAV_ITEM_TACTILE_CLASS,
														"border-border/60 border-b",
													)}
												>
													<ArrowSquareOutIcon
														className="text-muted-foreground size-5 shrink-0"
														aria-hidden="true"
													/>
													<span className="flex-1 text-sm font-medium">
														Voir le site
														<span className="sr-only"> (ouvre dans un nouvel onglet)</span>
													</span>
													<CaretRightIcon
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
														NAV_ROW_CLASS,
														NAV_ITEM_TACTILE_CLASS,
														"border-border/60 w-full border-b",
													)}
												>
													<KeyboardIcon
														className="text-muted-foreground size-5 shrink-0"
														aria-hidden="true"
													/>
													<span className="flex-1 text-left text-sm font-medium">
														Raccourcis clavier
													</span>
													<CaretRightIcon
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
														"flex min-h-11 w-full items-center gap-3 px-4 py-3 transition-colors",
														"active:bg-destructive/10",
														NAV_ITEM_TACTILE_CLASS,
													)}
												>
													<SignOutIcon
														className="text-destructive size-5 shrink-0"
														aria-hidden="true"
													/>
													<span className="min-w-0 flex-1 text-left">
														<span className="text-destructive block text-sm font-medium">
															Déconnexion
														</span>
														{/* L'identité du compte, là où elle sert vraiment : au moment
														 * de fermer la session. Elle occupait auparavant une carte
														 * entière en tête de panneau, dans la zone la moins
														 * atteignable, sans porter aucune action. */}
														{user.email && (
															<span className="text-muted-foreground block truncate text-xs">
																{user.email}
															</span>
														)}
													</span>
												</button>
											</li>
										</m.ul>
									</>
								)}
							</nav>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			{/* Région live d'ouverture — montée EN PERMANENCE et vide au premier rendu.
			 * Cf. le commentaire de `announcement` : une région qui naît avec son texte
			 * n'est pas annoncée. */}
			<p role="status" aria-live="polite" className="sr-only">
				{isSearching ? "" : announcement}
			</p>

			{/* Rendu hors du Sheet pour éviter overlays empilés / focus-trap
			 * concurrents : l'AlertDialog n'apparaît qu'après que la sheet a
			 * terminé sa transition de sortie (cf. useEffect transitionend). */}
			<LogoutAlertDialog open={showLogout} onOpenChange={setShowLogout} />
		</>
	);
}

// ============================================================================
// L'ARDOISE
// ============================================================================

/**
 * Les files réellement actionnables, en tête du panneau.
 *
 * C'est le changement de sujet du menu : il ne répond plus « où aller » mais
 * « ce qu'il reste à faire ». Chaque ligne mène à `badgeUrl` — la file FILTRÉE,
 * qui existait dans la SSOT depuis le début sans que cette surface la consomme.
 *
 * Rangée à 56 px (contre 44 pour la navigation) : la hiérarchie est portée par
 * la hauteur, donc elle survit sans couleur (WCAG 1.4.1).
 */
function QueueBoard({
	queues,
	onNavigate,
}: {
	queues: Array<{ item: NavItem; count: number }>;
	onNavigate: () => void;
}) {
	if (queues.length === 0) {
		return (
			<div className="border-border bg-background flex min-h-11 items-center gap-3 rounded-xl border px-4 py-3">
				<CheckCircleIcon className="text-success size-5 shrink-0" aria-hidden="true" />
				<p className="text-sm">
					<span className="font-semibold">Rien à traiter.</span>{" "}
					<span className="text-muted-foreground">Tu es à jour.</span>
				</p>
			</div>
		);
	}

	return (
		// Le filet d'accent est un ÉLÉMENT, pas un `border-left-color` : `bg-(--var)`
		// est la forme déjà employée dans le dépôt (navbar-wrapper), là où
		// `border-l-(--var)` laisserait Tailwind arbitrer entre couleur et largeur.
		<div
			data-accent="mint"
			className="border-border bg-background flex overflow-hidden rounded-xl border"
		>
			<span aria-hidden="true" className="w-[3px] shrink-0 bg-(--section-accent)" />
			{/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none */}
			<ul role="list" className="min-w-0 flex-1">
				{queues.map(({ item, count }, i) => {
					const label = queueLabel(item.id, count);
					const Icon = item.icon;
					return (
						<li key={item.id}>
							<Link
								href={item.badgeUrl ?? item.url}
								prefetch={null}
								onClick={onNavigate}
								// Le compte est déjà dans le nom accessible via le texte visible ;
								// pas d'aria-label qui le dupliquerait.
								className={cn(
									"active:bg-accent flex min-h-14 items-center gap-3.5 px-4 py-3 transition-colors",
									NAV_ITEM_TACTILE_CLASS,
									i < queues.length - 1 && "border-border/60 border-b",
								)}
							>
								{/* Largeur FIXE : « 3 » et « 12 » doivent tomber sur la même
								 * verticale, sinon les deux lignes ne se lisent pas comme une
								 * colonne. Et surtout PAS `tabular-nums` ici : la table GSUB de
								 * la display ne porte ni `tnum` ni `pnum` (mesuré sur Fraunces le 2026-08-04 ; Winky Sans est pareille),
								 * l'utilitaire y est inerte et ferait croire que l'alignement en
								 * vient. C'est la largeur fixe qui aligne. */}
								<span
									aria-hidden="true"
									className="font-display w-8 shrink-0 text-right text-2xl leading-none font-normal"
								>
									{count > 99 ? "99+" : count}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block text-[15px] leading-tight font-semibold">{label}</span>
									<span className="text-muted-foreground block text-xs">Ouvrir la file</span>
								</span>
								<Icon className="text-muted-foreground/60 size-5 shrink-0" aria-hidden="true" />
								<CaretRightIcon
									className="text-muted-foreground/50 size-4 shrink-0"
									aria-hidden="true"
								/>
							</Link>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

// ============================================================================
// LA CARTE DU SITE
// ============================================================================

/**
 * Un groupe de navigation, replié par défaut et déplié en place.
 *
 * Déplié « sur place » et jamais en second écran : le drill-down maître-détail a
 * été arbitré DEUX fois le 2026-05-20 sur le panneau de filtres, au profit de
 * l'accordéon sur écran unique.
 *
 * `defaultOpen={hasActiveItem}` — même règle que la sidebar desktop
 * (`collapsible-nav-group.tsx`) : arriver sur une page du groupe ne doit pas
 * laisser son groupe fermé.
 */
function NavGroupRow({
	group,
	pathname,
	badges,
	motionProps,
}: {
	group: (typeof navigationData.navGroups)[number];
	pathname: string;
	badges?: Record<string, number>;
	motionProps: FadeUpProps;
}) {
	const hasActiveItem = group.items.some((item) => isRouteActive(pathname, item.url));
	const GroupIcon = group.icon;

	return (
		<m.div {...motionProps} className="mb-2">
			<Collapsible defaultOpen={hasActiveItem} className="group/grp">
				<div
					data-accent={group.accent}
					className="bg-background border-border overflow-hidden rounded-xl border"
				>
					<CollapsibleTrigger
						onClick={() => triggerHaptic("selection")}
						className={cn(
							"flex min-h-13 w-full items-center gap-3 pr-4 text-left transition-colors",
							"active:bg-accent",
							"focus-ring touch-manipulation [-webkit-tap-highlight-color:transparent]",
						)}
					>
						<span aria-hidden="true" className="w-1 shrink-0 self-stretch bg-(--section-accent)" />
						{GroupIcon && (
							<GroupIcon
								className="text-muted-foreground ml-2 size-5 shrink-0"
								aria-hidden="true"
							/>
						)}
						<span className="flex-1 text-[15px] font-semibold">{group.label}</span>
						{/* Le compte évite de déplier pour savoir ce qu'il y a dedans.
						 * `aria-hidden` : l'état déplié/replié est déjà porté par
						 * `aria-expanded` de la primitive, et le nombre de pages n'est
						 * pas une information dont un lecteur d'écran a besoin ici. */}
						<span aria-hidden="true" className="text-muted-foreground text-xs tabular-nums">
							{group.items.length}
						</span>
						<CaretRightIcon
							className="text-muted-foreground/50 size-4 shrink-0 transition-transform group-data-open/grp:rotate-90"
							aria-hidden="true"
						/>
					</CollapsibleTrigger>
					<CollapsibleContent>
						{/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none */}
						<ul role="list" className="border-border/60 border-t">
							{group.items.map((item, itemIndex) => (
								<li key={item.id}>
									<NavRow
										item={item}
										pathname={pathname}
										badgeCount={badges?.[item.id]}
										isLast={itemIndex === group.items.length - 1}
										indented
									/>
								</li>
							))}
						</ul>
					</CollapsibleContent>
				</div>
			</Collapsible>
		</m.div>
	);
}

/**
 * Rangée de page — partagée par la liste filtrée et les groupes dépliés.
 *
 * Toujours `item.title`, jamais `shortTitle` : afficher « Promos » dans la liste
 * et « Codes promo » dans la recherche faisait changer de nom le même item d'une
 * vue à l'autre. Le filtre continue de matcher les DEUX champs, donc rien n'est
 * perdu côté recherche.
 *
 * La pastille reste dans le lien, décorative pour l'œil et exposée via
 * `aria-label` : elle n'a plus à porter `badgeUrl`, c'est l'ardoise qui mène
 * désormais à la file filtrée — et deux cibles tactiles imbriquées sur une
 * rangée de 44 px produisent surtout des taps ambigus.
 */
function NavRow({
	item,
	pathname,
	badgeCount,
	isLast,
	indented = false,
}: {
	item: (typeof navigationData.navGroups)[number]["items"][number];
	pathname: string;
	badgeCount?: number;
	isLast: boolean;
	indented?: boolean;
}) {
	const isActive = isRouteActive(pathname, item.url);
	const count = typeof badgeCount === "number" && badgeCount > 0 ? badgeCount : null;
	const Icon = item.icon;

	return (
		<Link
			href={item.url}
			prefetch={null}
			onClick={handleNavClick}
			className={cn(
				NAV_ROW_CLASS,
				NAV_ITEM_TACTILE_CLASS,
				indented && "pl-6",
				isActive && "bg-accent",
				!isLast && "border-border/60 border-b",
			)}
			aria-current={isActive ? "page" : undefined}
		>
			<Icon
				className={cn("size-5 shrink-0", isActive ? "text-foreground" : "text-muted-foreground")}
				aria-hidden="true"
			/>
			<span className={cn("flex-1 text-sm font-medium", isActive && "font-semibold")}>
				{item.title}
			</span>
			{count !== null && (
				<span
					className="bg-primary text-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold"
					aria-label={badgeAriaLabel(item.id, count)}
				>
					{count > 99 ? "99+" : count}
				</span>
			)}
			<CaretRightIcon className="text-muted-foreground/50 size-4 shrink-0" aria-hidden="true" />
		</Link>
	);
}
