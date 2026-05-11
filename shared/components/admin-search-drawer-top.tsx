"use client";

import { useLayoutEffect, useRef } from "react";
import { X } from "lucide-react";

import { SearchInput } from "@/shared/components/search-input";
import { Button } from "@/shared/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from "@/shared/components/ui/drawer";
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
}

/**
 * Drawer top compact "filter only" pour les listes admin mobile.
 *
 * Slide-in depuis le haut (~96px), non-modal : la liste reste visible et
 * interactive en arrière-plan. L'input filtre la page courante en live
 * via le param URL `?search=` (mode `live` du `SearchInput`).
 */
export function AdminSearchDrawerTop({
	open,
	onOpenChange,
	paramName = "search",
	placeholder = "Rechercher…",
	ariaLabel,
	id,
}: AdminSearchDrawerTopProps) {
	const triggerRef = useRef<HTMLElement | null>(null);

	useLayoutEffect(() => {
		if (open) {
			triggerRef.current = document.activeElement as HTMLElement | null;
		}
	}, [open]);

	return (
		<Drawer direction="top" modal={false} dismissible open={open} onOpenChange={onOpenChange}>
			<DrawerContent
				id={id}
				className={cn(
					"data-[vaul-drawer-direction=top]:mb-0",
					"data-[vaul-drawer-direction=top]:max-h-none",
					"data-[vaul-drawer-direction=top]:pt-[max(0.75rem,env(safe-area-inset-top))]",
					"data-[vaul-drawer-direction=top]:pb-3",
					"md:hidden",
				)}
				onCloseAutoFocus={(e) => {
					e.preventDefault();
					triggerRef.current?.focus();
				}}
			>
				<DrawerTitle className="sr-only">Rechercher</DrawerTitle>
				<div className="flex items-center gap-2">
					<div className="flex-1">
						<SearchInput
							paramName={paramName}
							mode="live"
							size="sm"
							preventMobileBlur
							debounceMs={300}
							placeholder={placeholder}
							ariaLabel={ariaLabel ?? placeholder}
							onEscape={() => onOpenChange(false)}
						/>
					</div>
					<DrawerClose asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="size-11 shrink-0"
							aria-label="Fermer la recherche"
						>
							<X className="size-5" />
						</Button>
					</DrawerClose>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
