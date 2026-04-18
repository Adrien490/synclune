"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
	CommandDialog,
	CommandDrawer,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/shared/components/ui/command";
import ScrollFade from "@/shared/components/scroll-fade";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { navigationData } from "./navigation-config";
import { Plus, Layers, Ticket, CircleHelp, Megaphone } from "lucide-react";

const QUICK_ACTIONS = [
	{
		id: "new-product",
		title: "Nouveau produit",
		url: "/admin/catalogue/produits/nouveau",
		icon: Plus,
	},
	{
		id: "new-collection",
		title: "Nouvelle collection",
		url: "/admin/catalogue/collections/nouveau",
		icon: Layers,
	},
	{
		id: "new-discount",
		title: "Nouveau code promo",
		url: "/admin/marketing/discounts",
		icon: Ticket,
	},
	{
		id: "new-announcement",
		title: "Nouvelle annonce",
		url: "/admin/contenu/annonces",
		icon: Megaphone,
	},
	{
		id: "new-faq",
		title: "Nouvelle question FAQ",
		url: "/admin/contenu/faq",
		icon: CircleHelp,
	},
] as const;

const MOBILE_AUTOFOCUS_DELAY_MS = 350;

export function CommandPalette() {
	const { isOpen, open, close, toggle } = useDialog("command-palette");
	const router = useRouter();
	const pathname = usePathname();
	const isMobile = useIsMobile();
	const previousFocusRef = useRef<HTMLElement | null>(null);
	const mobileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				toggle();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [toggle]);

	// Close on route change — palette can be open when user uses browser back,
	// URL bar, or swipe-back gesture. Pattern aligned with AdminMenuSheet.
	useEffect(() => {
		if (isOpen) close();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pathname]);

	// Mobile: delay autofocus until Vaul transition settles, otherwise iOS
	// keyboard pops before the sheet is in place and scrolls the viewport.
	useEffect(() => {
		if (!isOpen || !isMobile) return;
		const t = setTimeout(() => {
			mobileInputRef.current?.focus({ preventScroll: true });
		}, MOBILE_AUTOFOCUS_DELAY_MS);
		return () => clearTimeout(t);
	}, [isOpen, isMobile]);

	function handleOpenChange(nextOpen: boolean) {
		if (nextOpen) {
			// Snapshot current focus target so we can restore after close (desktop
			// keyboard users). Skip on mobile: programmatic .focus() on the trigger
			// re-activates :focus-visible in Chromium, leaving a visible ring after
			// tap-driven close which is perceived as a bug.
			if (!isMobile && document.activeElement instanceof HTMLElement) {
				previousFocusRef.current = document.activeElement;
				document.activeElement.blur();
			}
			open();
		} else {
			close();
			if (!isMobile) {
				const target = previousFocusRef.current;
				if (target && document.contains(target)) {
					setTimeout(() => target.focus({ preventScroll: true }), 0);
				}
			}
			previousFocusRef.current = null;
		}
	}

	function handleSelect(url: string) {
		triggerHaptic("selection");
		close();
		router.push(url);
	}

	function renderList(options: { mobile: boolean }) {
		return (
			<CommandList
				className={
					options.mobile
						? "max-h-none overflow-visible pb-[max(1rem,env(safe-area-inset-bottom))]"
						: undefined
				}
			>
				<CommandEmpty>Aucun resultat.</CommandEmpty>

				<CommandGroup heading="Actions rapides">
					{QUICK_ACTIONS.map((action) => {
						const Icon = action.icon;
						return (
							<CommandItem
								key={action.id}
								value={`${action.title} action creer nouveau`}
								onSelect={() => handleSelect(action.url)}
							>
								<Icon className="mr-2 h-4 w-4" aria-hidden="true" />
								{action.title}
							</CommandItem>
						);
					})}
				</CommandGroup>

				<CommandSeparator />

				{navigationData.navGroups.map((group) => (
					<CommandGroup key={group.label} heading={group.label}>
						{group.items.map((item) => {
							const Icon = item.icon;

							return (
								<CommandItem
									key={item.id}
									value={`${item.title} ${group.label}`}
									onSelect={() => handleSelect(item.url)}
								>
									<Icon className="mr-2 h-4 w-4" aria-hidden="true" />
									{item.title}
								</CommandItem>
							);
						})}
					</CommandGroup>
				))}
			</CommandList>
		);
	}

	if (isMobile) {
		return (
			<CommandDrawer
				open={isOpen}
				onOpenChange={handleOpenChange}
				title="Recherche rapide"
				description="Naviguer ou creer rapidement"
				onOverlayClick={() => triggerHaptic("selection")}
			>
				<CommandInput
					ref={mobileInputRef}
					placeholder="Rechercher une page ou une action..."
					inputMode="search"
					enterKeyHint="search"
				/>
				<div className="min-h-0 flex-1">
					<ScrollFade axis="vertical" fadeFromClass="from-popover" className="overscroll-contain">
						{renderList({ mobile: true })}
					</ScrollFade>
				</div>
			</CommandDrawer>
		);
	}

	return (
		<CommandDialog
			open={isOpen}
			onOpenChange={handleOpenChange}
			title="Recherche rapide"
			description="Naviguer ou creer rapidement"
		>
			<div className="relative">
				<CommandInput placeholder="Rechercher une page ou une action..." />
				<kbd
					aria-hidden="true"
					className="bg-muted text-muted-foreground pointer-events-none absolute top-1/2 right-3 hidden h-6 -translate-y-1/2 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-medium sm:inline-flex"
				>
					<span className="text-sm">⌘</span>K
				</kbd>
			</div>
			{renderList({ mobile: false })}
		</CommandDialog>
	);
}
