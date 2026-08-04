"use client";

import { CaretRightIcon } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";

import { Spinner } from "@/shared/components/ui/spinner";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/shared/components/ui/button";
import {
	Drawer,
	DrawerBody,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/shared/components/ui/drawer";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { triggerHaptic, type HapticPattern } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";

/**
 * A single action inside a {@link ResponsiveActionMenuContent}.
 *
 * Provide either `onSelect` **or** `href` (for link-based navigation).
 * Use `variant="destructive"` for dangerous actions — they render with a
 * dedicated destructive color scheme on both desktop (red item) and mobile
 * (red icon pill + label).
 */
export type ActionMenuItem = {
	/** Stable key for React — usually the action name. */
	key: string;
	/** Primary label (French). */
	label: string;
	/** Optional short description shown under the label on mobile. */
	description?: string;
	/** Leading icon from @phosphor-icons/react/ssr. Rendered in a 40×40 pill on mobile. */
	icon?: Icon;
	/** Visual variant. @default "default" */
	variant?: "default" | "destructive";
	/** Render the action disabled (greyed, no pointer). */
	disabled?: boolean;
	/** Hide the action entirely (useful for conditional items). */
	hidden?: boolean;
	/**
	 * Async pending state. Swaps the icon for a spinner, sets
	 * `aria-busy="true"` and blocks activation (ignores tap + Enter).
	 */
	pending?: boolean;
	/**
	 * Haptic pattern fired on select.
	 * Default: `"light"` — or `"medium"` for destructive variants.
	 */
	haptic?: HapticPattern;
	/**
	 * Mobile-only. When `false`, the parent drawer stays open after the
	 * action is selected — use for actions that open a confirmation
	 * `ResponsiveAlertDialog` or sub-sheet so the confirm stacks visibly
	 * over the action menu (iOS pattern). Desktop unaffected: the
	 * `DropdownMenu` always closes naturally on selection.
	 * @default true
	 */
	closesMenu?: boolean;
} & (
	| { onSelect: () => void; href?: never; external?: never }
	| { href: string; external?: boolean; onSelect?: never }
);

/**
 * A group of {@link ActionMenuItem}s. Sections are visually separated on
 * both mobile (border or uppercase label) and desktop (separator).
 */
export type ActionMenuSection = {
	key: string;
	/** Optional uppercase section heading (mobile only). */
	label?: string;
	items: ActionMenuItem[];
};

type Ctx = {
	isMobile: boolean;
	/**
	 * Direct setter for the controlled `open` prop. Used by mobile `href` rows
	 * to close the drawer without going through the `onOpenChange` →
	 * `useBackButtonClose.handleClose` → `history.back()` path, which would
	 * otherwise race against Next.js `<Link>` `router.push` and cancel the
	 * navigation.
	 */
	requestClose: () => void;
};
const ResponsiveActionMenuContext = React.createContext<Ctx | null>(null);

function useMenuCtx() {
	const ctx = React.use(ResponsiveActionMenuContext);
	if (!ctx) {
		throw new Error(
			"ResponsiveActionMenu subcomponents must be nested within <ResponsiveActionMenu>",
		);
	}
	return ctx;
}

interface ResponsiveActionMenuProps {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	children: React.ReactNode;
}

/**
 * Contextual action menu primitive.
 *
 * - **Desktop (≥ md)** — `DropdownMenu` Base UI anchored to the trigger.
 * - **Mobile (< md)** — bottom `Drawer` Base UI (iOS ActionSheet / Material 3
 *   bottom sheet): handle drag, safe-area bottom, full-width actions with
 *   icon pills, destructive section, sticky "Annuler" button. Haptic fires
 *   on each selection and on overlay/scrim dismiss.
 *
 * The two render surfaces share the same structured API
 * ({@link ActionMenuSection}[]). Sub-menus are **not** supported in v1 —
 * flatten nested actions into explicit top-level items (e.g. "Marquer
 * comme brouillon" / "Publier" instead of "Statut > Brouillon / Public").
 *
 * Focus restoration is handled explicitly: the element that opened the
 * menu regains focus on close via `requestAnimationFrame` + `preventScroll`
 * (prevents iOS Safari scroll-jank, cohérent avec AdminMenuSheet).
 *
 * @example
 * ```tsx
 * <ResponsiveActionMenu>
 *   <ResponsiveActionMenuTrigger
 *     render={<Button variant="ghost" aria-label="Actions"><EllipsisVertical /></Button>}
 *   />
 *   <ResponsiveActionMenuContent
 *     title="Actions"
 *     description="Bague Rose Cendrée"
 *     sections={[
 *       { key: "manage", items: [{ key: "edit", label: "Modifier", icon: Pencil, onSelect: openEdit }] },
 *       { key: "danger", items: [{ key: "del", label: "Supprimer", icon: Trash2, variant: "destructive", onSelect: confirmDelete }] },
 *     ]}
 *   />
 * </ResponsiveActionMenu>
 * ```
 */
export function ResponsiveActionMenu({ open, onOpenChange, children }: ResponsiveActionMenuProps) {
	const isMobile = useIsMobile();
	const previousFocusRef = React.useRef<HTMLElement | null>(null);

	const ctx: Ctx = {
		isMobile,
		requestClose: () => onOpenChange?.(false),
	};

	const handleOpenChange = (next: boolean) => {
		if (next) {
			if (typeof document !== "undefined") {
				previousFocusRef.current = document.activeElement as HTMLElement | null;
			}
		} else {
			const toRestore = previousFocusRef.current;
			if (toRestore && typeof toRestore.focus === "function") {
				requestAnimationFrame(() => {
					toRestore.focus({ preventScroll: true });
				});
			}
		}
		onOpenChange?.(next);
	};

	if (isMobile) {
		return (
			<ResponsiveActionMenuContext.Provider value={ctx}>
				<Drawer open={open} onOpenChange={handleOpenChange} direction="bottom">
					{children}
				</Drawer>
			</ResponsiveActionMenuContext.Provider>
		);
	}

	return (
		<ResponsiveActionMenuContext.Provider value={ctx}>
			<DropdownMenu open={open} onOpenChange={handleOpenChange}>
				{children}
			</DropdownMenu>
		</ResponsiveActionMenuContext.Provider>
	);
}

interface TriggerProps {
	children?: React.ReactNode;
	/** Équivalent Base UI de l'ancien `asChild` Radix. */
	render?: React.ReactElement;
}

const handleClick = () => {
	triggerHaptic("selection");
};

export function ResponsiveActionMenuTrigger({ children, render }: TriggerProps) {
	const { isMobile } = useMenuCtx();
	const Trigger = isMobile ? DrawerTrigger : DropdownMenuTrigger;

	// Les deux branches sont sur Base UI : même prop `render`, plus d'asymétrie.
	return (
		<Trigger render={render} onClick={handleClick}>
			{children}
		</Trigger>
	);
}

interface ContentProps {
	/** Sheet title mobile, also used as `aria-label`. */
	title: string;
	/** Optional one-line subtitle below the title (mobile only). */
	description?: string;
	/** Grouped actions. Empty or all-hidden sections are filtered out. */
	sections: ActionMenuSection[];
	/** Dropdown alignment (desktop only). @default "end" */
	align?: "start" | "center" | "end";
	/** Width class override for the desktop dropdown. @default "w-56" */
	desktopWidthClass?: string;
	/** Cancel button label (mobile). @default "Annuler" */
	cancelLabel?: string;
}

export function ResponsiveActionMenuContent({
	title,
	description,
	sections,
	align = "end",
	desktopWidthClass = "w-56",
	cancelLabel = "Annuler",
}: ContentProps) {
	const { isMobile } = useMenuCtx();

	const visibleSections = sections
		.map((s) => ({ ...s, items: s.items.filter((it) => !it.hidden) }))
		.filter((s) => s.items.length > 0);
	const itemCount = visibleSections.reduce((acc, s) => acc + s.items.length, 0);

	if (isMobile) {
		return (
			<DrawerContent aria-label={title} onOverlayClick={() => triggerHaptic("selection")}>
				<DrawerHeader>
					<DrawerTitle>{title}</DrawerTitle>
					{description ? <DrawerDescription>{description}</DrawerDescription> : null}
				</DrawerHeader>
				<DrawerBody className="px-0">
					<span className="sr-only" role="status" aria-live="polite">
						{itemCount} action{itemCount > 1 ? "s" : ""} disponible{itemCount > 1 ? "s" : ""}
					</span>
					<div className="flex flex-col" role="menu" aria-label={title}>
						{visibleSections.map((section, si) => (
							<React.Fragment key={section.key}>
								{section.label ? (
									<p className="text-muted-foreground px-4 pt-4 pb-2 text-xs font-semibold tracking-wider uppercase">
										{section.label}
									</p>
								) : si > 0 ? (
									<div className="border-border/60 my-2 border-t" aria-hidden="true" />
								) : null}
								{section.items.map((item) => (
									<MobileActionRow key={item.key} item={item} />
								))}
							</React.Fragment>
						))}
					</div>
				</DrawerBody>
				<DrawerFooter className="pt-2">
					<DrawerClose
						render={
							<Button
								variant="outline"
								size="lg"
								className="h-12 w-full"
								onClick={() => triggerHaptic("light")}
							/>
						}
					>
						{cancelLabel}
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		);
	}

	return (
		<DropdownMenuContent align={align} className={desktopWidthClass} aria-label={title}>
			<span className="sr-only">
				Utilisez les flèches pour naviguer, Entrée pour sélectionner, Échap pour fermer.
			</span>
			{visibleSections.map((section, si) => (
				<React.Fragment key={section.key}>
					{si > 0 ? <DropdownMenuSeparator /> : null}
					{section.items.map((item) => (
						<DesktopActionItem key={item.key} item={item} />
					))}
				</React.Fragment>
			))}
		</DropdownMenuContent>
	);
}

function DesktopActionItem({ item }: { item: ActionMenuItem }) {
	const Icon = item.icon;
	const hapticPattern: HapticPattern =
		item.haptic ?? (item.variant === "destructive" ? "medium" : "light");
	const isInert = item.disabled === true || item.pending === true;
	const ariaBusy = item.pending === true ? true : undefined;

	if (item.href) {
		return (
			<DropdownMenuItem
				render={
					<Link
						href={item.href}
						target={item.external ? "_blank" : undefined}
						rel={item.external ? "noopener noreferrer" : undefined}
						tabIndex={isInert ? -1 : undefined}
						aria-disabled={isInert ? true : undefined}
						onClick={(e) => {
							if (isInert) {
								e.preventDefault();
								return;
							}
							triggerHaptic(hapticPattern);
						}}
					/>
				}
				disabled={isInert}
				variant={item.variant}
				aria-busy={ariaBusy}
			>
				{item.pending ? (
					<Spinner presentational />
				) : Icon ? (
					<Icon className="size-4" aria-hidden="true" />
				) : null}
				{item.label}
			</DropdownMenuItem>
		);
	}

	return (
		<DropdownMenuItem
			disabled={isInert}
			variant={item.variant}
			aria-busy={ariaBusy}
			// Base UI n'a pas d'`onSelect` : l'activation passe par `onClick`, et le
			// maintien du menu ouvert par `closeOnClick` — plus par un
			// `event.preventDefault()`. Laisser `onSelect` ici rendait l'action MORTE
			// (prop inconnue, silencieusement ignorée).
			closeOnClick={!item.pending}
			onClick={() => {
				if (item.pending) return;
				triggerHaptic(hapticPattern);
				item.onSelect?.();
			}}
		>
			{item.pending ? (
				<Spinner presentational />
			) : Icon ? (
				<Icon className="size-4" aria-hidden="true" />
			) : null}
			{item.label}
		</DropdownMenuItem>
	);
}

function MobileActionRow({ item }: { item: ActionMenuItem }) {
	const { requestClose } = useMenuCtx();
	const Icon = item.icon;
	const isDestructive = item.variant === "destructive";
	const isInert = item.disabled === true || item.pending === true;
	const ariaBusy = item.pending === true ? true : undefined;
	const hapticPattern: HapticPattern = item.haptic ?? (isDestructive ? "medium" : "light");

	const body = (
		<span
			className={cn(
				"flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left",
				"active:bg-accent/80 active:scale-[0.99] motion-safe:transition-[background-color,transform] motion-safe:duration-100",
				isInert && "pointer-events-none opacity-50",
			)}
		>
			{item.pending ? (
				<span
					className={cn(
						"flex size-10 shrink-0 items-center justify-center rounded-full",
						isDestructive ? "bg-destructive/10 text-destructive" : "bg-muted/60 text-foreground",
					)}
					aria-hidden="true"
				>
					<Spinner presentational size="lg" />
				</span>
			) : Icon ? (
				<span
					className={cn(
						"flex size-10 shrink-0 items-center justify-center rounded-full",
						isDestructive ? "bg-destructive/10 text-destructive" : "bg-muted/60 text-foreground",
					)}
					aria-hidden="true"
				>
					<Icon className="size-5" />
				</span>
			) : null}
			<span className="flex min-w-0 flex-1 flex-col">
				<span
					className={cn(
						"truncate text-base font-medium",
						isDestructive ? "text-destructive" : "text-foreground",
					)}
				>
					{item.label}
				</span>
				{item.description ? (
					<span className="text-muted-foreground truncate text-xs">{item.description}</span>
				) : null}
			</span>
			{item.href && item.external ? (
				<CaretRightIcon className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
			) : null}
		</span>
	);

	const focusClasses =
		"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none";

	const closesMenu = item.closesMenu !== false;

	if (item.href) {
		// `Link` is NOT wrapped in `<DrawerClose asChild>` — that path triggers
		// Vaul's `onOpenChange` → `useBackButtonClose.handleClose` → `history.back()`
		// which races synchronously against `Link.linkClicked`'s `router.push`
		// (queued in `startTransition`) and cancels the navigation. We close the
		// drawer via the controlled `open` prop instead, which updates the prop
		// silently (no Vaul `onOpenChange` round-trip, no `history.back()`).
		return (
			<Link
				href={item.href}
				target={item.external ? "_blank" : undefined}
				rel={item.external ? "noopener noreferrer" : undefined}
				tabIndex={isInert ? -1 : undefined}
				aria-disabled={isInert ? true : undefined}
				aria-busy={ariaBusy}
				onClick={(e) => {
					if (isInert) {
						e.preventDefault();
						return;
					}
					triggerHaptic(hapticPattern);
					if (closesMenu) requestClose();
				}}
				className={cn("block w-full", focusClasses)}
				role="menuitem"
			>
				{body}
			</Link>
		);
	}

	const button = (
		<button
			type="button"
			role="menuitem"
			disabled={isInert}
			aria-busy={ariaBusy}
			onClick={() => {
				if (isInert) return;
				triggerHaptic(hapticPattern);
				item.onSelect?.();
			}}
			className={cn("w-full", focusClasses)}
		>
			{body}
		</button>
	);

	return closesMenu ? <DrawerClose render={button} /> : button;
}
