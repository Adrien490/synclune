"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { SearchInput } from "@/shared/components/search-input";
import { Button } from "@/shared/components/ui/button";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerHandle,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

interface AdminSearchDrawerTopProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	paramName?: string;
	placeholder?: string;
	ariaLabel?: string;
	/**
	 * DOM `id` of the drawer content node. Wire in pair with `aria-controls`
	 * on the trigger button.
	 */
	id?: string;
	/**
	 * Visible context label rendered above the input (ex. "Filtrer les commandes").
	 * Also used for the screen-reader `DrawerTitle` fallback.
	 */
	title?: string;
	/**
	 * Live result count displayed as a discreet chip before the close button.
	 * Allows the administratrice to see filter impact without closing the drawer.
	 * `> 99` is rendered as `99+`.
	 */
	resultCount?: number;
	/**
	 * Auto-focus the input on open (default `true`). Disable for cases where
	 * focus should land elsewhere (e.g. tour overlay).
	 */
	autoFocus?: boolean;
}

/**
 * Drawer top compact "filter only" pour les listes admin mobile.
 *
 * Slide-in depuis le haut, non-modal : la liste reste visible et interactive
 * en arrière-plan. L'input filtre la page courante en live via le param URL
 * `?search=` (mode `live` du `SearchInput`).
 */
export function AdminSearchDrawerTop({
	open,
	onOpenChange,
	paramName = "search",
	placeholder = "Rechercher…",
	ariaLabel,
	id,
	title,
	resultCount,
	autoFocus = true,
}: AdminSearchDrawerTopProps) {
	const triggerRef = useRef<HTMLElement | null>(null);
	const triggerHaptic = useHaptic();

	useEffect(() => {
		if (!open) return;
		const active = document.activeElement as HTMLElement | null;
		if (active && active !== document.body) {
			triggerRef.current = active;
		}
	}, [open]);

	const handleOpenChange = (next: boolean) => {
		if (!next) triggerHaptic("selection");
		onOpenChange(next);
	};

	return (
		<Drawer
			direction="top"
			modal={false}
			dismissible
			repositionInputs
			open={open}
			onOpenChange={handleOpenChange}
		>
			<DrawerContent
				id={id}
				aria-modal={false}
				data-testid="admin-search-drawer-top"
				className={cn(
					"data-[vaul-drawer-direction=top]:mb-0",
					"data-[vaul-drawer-direction=top]:max-h-none",
					"data-[vaul-drawer-direction=top]:pt-[max(0.75rem,env(safe-area-inset-top))]",
					"data-[vaul-drawer-direction=top]:pb-3",
					"overscroll-contain",
					"md:hidden",
				)}
				onCloseAutoFocus={(e) => {
					e.preventDefault();
					const fallback = id
						? document.querySelector<HTMLElement>(`[aria-controls="${id}"]`)
						: null;
					(triggerRef.current ?? fallback)?.focus({ preventScroll: true });
				}}
			>
				<DrawerTitle className="sr-only">{title ?? "Rechercher"}</DrawerTitle>
				{title ? (
					<p className="text-muted-foreground px-1 pb-1 text-xs" aria-hidden="true">
						{title}
					</p>
				) : null}
				<div className="flex items-center gap-2">
					<div className="flex-1">
						<SearchInput
							paramName={paramName}
							size="sm"
							// eslint-disable-next-line jsx-a11y/no-autofocus
							autoFocus={autoFocus}
							preventMobileBlur
							debounceMs={300}
							placeholder={placeholder}
							aria-label={ariaLabel ?? placeholder}
							onEscape={() => onOpenChange(false)}
						/>
					</div>
					{typeof resultCount === "number" ? (
						<span
							className="text-muted-foreground shrink-0 text-xs tabular-nums"
							aria-live="polite"
							data-testid="admin-search-drawer-top-count"
						>
							{resultCount > 99 ? "99+" : resultCount}
						</span>
					) : null}
					<DrawerClose asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label="Fermer la recherche (Échap)"
							aria-keyshortcuts="Escape"
							className={cn(
								"size-11 shrink-0",
								"motion-safe:transition-transform motion-safe:duration-[var(--duration-fast)] motion-safe:active:scale-[0.98]",
								"touch-manipulation [-webkit-tap-highlight-color:transparent]",
							)}
						>
							<X className="size-5" />
						</Button>
					</DrawerClose>
				</div>
				<DrawerHandle
					className="!mx-auto !mt-3 !mb-0 !block opacity-60"
					aria-label="Glisser vers le haut pour fermer"
				/>
			</DrawerContent>
		</Drawer>
	);
}
