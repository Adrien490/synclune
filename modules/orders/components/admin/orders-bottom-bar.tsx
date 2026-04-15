"use client";

import { useRef, useState } from "react";
import { useToolbarDrawer } from "@/shared/hooks";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu, Search, ArrowUpDown, SlidersHorizontal, X } from "lucide-react";
import {
	BottomBar,
	ActiveDot,
	bottomBarContainerClass,
	bottomBarItemClass,
	bottomBarActiveItemClass,
	bottomBarIconClass,
	bottomBarLabelClass,
} from "@/shared/components/bottom-bar";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import { Button } from "@/shared/components/ui/button";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useSheetStore } from "@/shared/providers/sheet-store-provider";
import { cn } from "@/shared/utils/cn";
import { SORT_LABELS } from "../../constants/order.constants";
import { OrdersFilterDrawer } from "./orders-filter-drawer";

const SORT_OPTIONS: SortOption[] = Object.entries(SORT_LABELS).map(([value, label]) => ({
	value,
	label,
}));

/**
 * Barre d'actions fixe en bas pour mobile (tri, recherche, filtre, menu).
 *
 * 4 boutons:
 * - Trier -> ouvre SortDrawer
 * - Rechercher -> ouvre un drawer avec input
 * - Filtrer -> ouvre OrdersFilterDrawer
 * - Menu -> ouvre le menu admin
 *
 * Visible uniquement mobile (md:hidden).
 * Se cache quand un sheet/dialog est ouvert.
 */
export function OrdersBottomBar() {
	const { openDrawer, open, close, isOpen, onOpenChange } = useToolbarDrawer<
		"sort" | "search" | "filter"
	>();
	const [focusedIndex, setFocusedIndex] = useState(0);

	const searchParams = useSearchParams();
	const router = useRouter();

	// Nav menu — same dialog as global nav bar, consistent across all pages
	const {
		isOpen: isMenuOpen,
		open: openNavMenu,
		close: closeNavMenu,
	} = useDialog("admin-menu-sheet");
	const isAnySheetOpen = useSheetStore((state) => state.openSheet !== null);

	// Active states
	const hasActiveSearch = searchParams.has("search") && searchParams.get("search") !== "";
	const hasActiveSort = searchParams.has("sortBy");
	const hasActiveFilter =
		searchParams.has("filter_status") ||
		searchParams.has("filter_paymentStatus") ||
		searchParams.has("filter_totalMin") ||
		searchParams.has("filter_totalMax") ||
		searchParams.has("filter_createdAfter") ||
		searchParams.has("filter_createdBefore") ||
		searchParams.has("filter_showDeleted");

	const isHidden = openDrawer !== null || isMenuOpen || isAnySheetOpen;

	// Refs for toolbar buttons
	const sortButtonRef = useRef<HTMLButtonElement>(null);
	const searchButtonRef = useRef<HTMLButtonElement>(null);
	const filterButtonRef = useRef<HTMLButtonElement>(null);
	const menuButtonRef = useRef<HTMLButtonElement>(null);
	const buttonRefs = [sortButtonRef, searchButtonRef, filterButtonRef, menuButtonRef];

	// Keyboard navigation for toolbar
	const handleToolbarKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
		const buttonCount = 4;
		let nextIndex: number | null = null;

		switch (e.key) {
			case "ArrowRight":
			case "ArrowDown":
				e.preventDefault();
				nextIndex = (currentIndex + 1) % buttonCount;
				break;
			case "ArrowLeft":
			case "ArrowUp":
				e.preventDefault();
				nextIndex = (currentIndex - 1 + buttonCount) % buttonCount;
				break;
			case "Home":
				e.preventDefault();
				nextIndex = 0;
				break;
			case "End":
				e.preventDefault();
				nextIndex = buttonCount - 1;
				break;
		}

		if (nextIndex !== null) {
			setFocusedIndex(nextIndex);
			buttonRefs[nextIndex]?.current?.focus();
		}
	};

	const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const search = (formData.get("search") as string | null)?.trim();

		const params = new URLSearchParams(searchParams);
		params.delete("cursor");
		params.delete("direction");

		if (search) {
			params.set("search", search);
		} else {
			params.delete("search");
		}

		router.push(`?${params.toString()}`, { scroll: false });
		close();
	};

	const handleClearSearch = () => {
		const params = new URLSearchParams(searchParams);
		params.delete("search");
		params.delete("cursor");
		params.delete("direction");
		router.push(`?${params.toString()}`, { scroll: false });
		close();
	};

	const buttonClassName = cn(bottomBarItemClass, "min-w-16");
	const activeButtonClassName = cn(buttonClassName, bottomBarActiveItemClass);

	// Portal to document.body to escape admin sidebar's containing block
	if (typeof document === "undefined") return null;

	return createPortal(
		<>
			<BottomBar
				as="nav"
				aria-label="Tri, recherche, filtres et menu"
				isHidden={isHidden}
				breakpointClass="md:hidden"
			>
				<div
					role="toolbar"
					aria-orientation="horizontal"
					aria-label="Tri, recherche, filtres et menu"
					className={bottomBarContainerClass}
				>
					{/* Trier */}
					<button
						ref={sortButtonRef}
						type="button"
						onClick={() => open("sort")}
						onKeyDown={(e) => handleToolbarKeyDown(e, 0)}
						onFocus={() => setFocusedIndex(0)}
						tabIndex={focusedIndex === 0 ? 0 : -1}
						className={hasActiveSort ? activeButtonClassName : buttonClassName}
						aria-label={hasActiveSort ? "Tri actif. Modifier le tri" : "Ouvrir les options de tri"}
						aria-haspopup="dialog"
					>
						{hasActiveSort && <ActiveDot />}
						<ArrowUpDown className={bottomBarIconClass} aria-hidden="true" />
						<span className={bottomBarLabelClass}>Trier</span>
					</button>

					{/* Rechercher */}
					<button
						ref={searchButtonRef}
						type="button"
						onClick={() => open("search")}
						onKeyDown={(e) => handleToolbarKeyDown(e, 1)}
						onFocus={() => setFocusedIndex(1)}
						tabIndex={focusedIndex === 1 ? 0 : -1}
						className={hasActiveSearch ? activeButtonClassName : buttonClassName}
						aria-label={
							hasActiveSearch
								? `Recherche: "${searchParams.get("search")}". Modifier la recherche`
								: "Ouvrir la recherche"
						}
						aria-haspopup="dialog"
					>
						{hasActiveSearch && <ActiveDot />}
						<Search className={bottomBarIconClass} aria-hidden="true" />
						<span className={bottomBarLabelClass}>Rechercher</span>
					</button>

					{/* Filtrer */}
					<button
						ref={filterButtonRef}
						type="button"
						onClick={() => open("filter")}
						onKeyDown={(e) => handleToolbarKeyDown(e, 2)}
						onFocus={() => setFocusedIndex(2)}
						tabIndex={focusedIndex === 2 ? 0 : -1}
						className={hasActiveFilter ? activeButtonClassName : buttonClassName}
						aria-label={hasActiveFilter ? "Filtre actif. Modifier le filtre" : "Ouvrir les filtres"}
						aria-haspopup="dialog"
					>
						{hasActiveFilter && <ActiveDot />}
						<SlidersHorizontal className={bottomBarIconClass} aria-hidden="true" />
						<span className={bottomBarLabelClass}>Filtrer</span>
					</button>

					{/* Menu — navigation globale admin (coherent avec la nav bar globale) */}
					<button
						ref={menuButtonRef}
						type="button"
						onClick={() => (isMenuOpen ? closeNavMenu() : openNavMenu())}
						onKeyDown={(e) => handleToolbarKeyDown(e, 3)}
						onFocus={() => setFocusedIndex(3)}
						tabIndex={focusedIndex === 3 ? 0 : -1}
						className={buttonClassName}
						aria-label={
							isMenuOpen ? "Fermer le menu de navigation" : "Ouvrir le menu de navigation"
						}
						aria-haspopup="dialog"
						aria-expanded={isMenuOpen}
					>
						<Menu className={bottomBarIconClass} aria-hidden="true" />
						<span className={bottomBarLabelClass}>Menu</span>
					</button>
				</div>
			</BottomBar>

			{/* Sort Drawer */}
			<SortDrawer
				open={isOpen("sort")}
				onOpenChange={onOpenChange("sort")}
				options={SORT_OPTIONS}
				showResetOption
			/>

			{/* Search Drawer */}
			<Drawer open={isOpen("search")} onOpenChange={onOpenChange("search")}>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>Rechercher</DrawerTitle>
					</DrawerHeader>
					<DrawerBody>
						<form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
							<div className="relative">
								<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
								<input
									name="search"
									type="search"
									// eslint-disable-next-line jsx-a11y/no-autofocus -- Drawer context: user explicitly opened search
									autoFocus
									defaultValue={searchParams.get("search") ?? ""}
									placeholder="Rechercher par numéro, email, client..."
									aria-label="Rechercher une commande"
									className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-11 w-full rounded-lg border py-2 pr-10 pl-10 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
								/>
								{hasActiveSearch && (
									<button
										type="button"
										onClick={handleClearSearch}
										className="absolute top-1/2 right-3 -translate-y-1/2"
										aria-label="Effacer la recherche"
									>
										<X className="text-muted-foreground size-4" />
									</button>
								)}
							</div>
							<Button type="submit" className="w-full">
								Rechercher
							</Button>
						</form>
					</DrawerBody>
				</DrawerContent>
			</Drawer>

			{/* Filter Drawer */}
			<OrdersFilterDrawer open={isOpen("filter")} onOpenChange={onOpenChange("filter")} />
		</>,
		document.body,
	);
}
