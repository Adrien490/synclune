"use client";

import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import { HamburgerIcon } from "@/shared/components/icons/hamburger-icon";
import { Logo } from "@/shared/components/logo";
import ScrollFade from "@/shared/components/scroll-fade";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/shared/components/ui/sheet";
import { BRAND } from "@/shared/constants/brand";
import { useEdgeSwipe } from "@/shared/hooks/use-edge-swipe";
import { isRouteActive } from "@/shared/lib/navigation";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AdminMenuCollapsibleGroup } from "./admin-menu-collapsible-group";
import { AdminMenuQuickAccess } from "./admin-menu-quick-access";
import { getQuickAccessItems, navigationData } from "./navigation-config";

interface AdminMenuSheetProps {
	user: {
		name: string;
		email: string;
	};
	badges?: Record<string, number>;
}

const quickAccessItems = getQuickAccessItems();

export function AdminMenuSheet({ user, badges }: AdminMenuSheetProps) {
	const { isOpen, open: openMenu, close: closeMenu } = useDialog("admin-menu-sheet");
	const [showLogout, setShowLogout] = useState(false);
	const pathname = usePathname();
	const navRef = useRef<HTMLElement>(null);
	useEdgeSwipe(openMenu, isOpen, 768);

	// Close on navigation
	useEffect(() => {
		if (isOpen) closeMenu();
	}, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

	// Focus management: scroll to active item and focus first link after open
	useEffect(() => {
		if (!isOpen || !navRef.current) return;

		const timer = setTimeout(() => {
			const activeLink = navRef.current?.querySelector<HTMLAnchorElement>('[aria-current="page"]');
			if (activeLink) {
				activeLink.scrollIntoView({ block: "nearest", behavior: "smooth" });
				activeLink.focus({ preventScroll: true });
			} else {
				const firstLink = navRef.current?.querySelector<HTMLAnchorElement>("a");
				firstLink?.focus({ preventScroll: true });
			}
		}, 350);

		return () => clearTimeout(timer);
	}, [isOpen]);

	function handleLogoutClick() {
		closeMenu();
		setTimeout(() => setShowLogout(true), 150);
	}

	function handleOpenChange(open: boolean) {
		if (open) {
			// Blur trigger before open to prevent aria-hidden/focus conflicts
			if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
			openMenu();
		} else {
			closeMenu();
		}
	}

	return (
		<>
			<Sheet
				direction="left"
				open={isOpen}
				onOpenChange={handleOpenChange}
				preventScrollRestoration
			>
				<SheetContent className="bg-background/95 flex w-[min(88vw,340px)] flex-col border-r p-0! sm:w-80 sm:max-w-md">
					<SheetHeader className="sr-only p-0!">
						<SheetTitle>Menu d&apos;administration</SheetTitle>
						<SheetDescription>Navigation du tableau de bord administrateur</SheetDescription>
					</SheetHeader>

					{/* Header — safe area top for iOS notch */}
					<div className="flex items-center gap-3 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
						<Logo size={36} rounded="lg" />
						<span className="font-cursive text-xl font-normal tracking-wide">{BRAND.name}</span>
					</div>

					{/* Scrollable nav */}
					<div className="min-h-0 flex-1">
						<ScrollFade axis="vertical" className="h-full" hideScrollbar={false}>
							{/* Quick access section */}
							<AdminMenuQuickAccess items={quickAccessItems} pathname={pathname} badges={badges} />

							<div className="border-border/50 mx-4 border-t" aria-hidden="true" />

							{/* Navigation groups */}
							<nav ref={navRef} aria-label="Navigation administration" className="px-3 py-3">
								{navigationData.navGroups.map((group, groupIndex) =>
									group.collapsible ? (
										<div key={group.label} className={cn(groupIndex > 0 && "mt-2")}>
											<AdminMenuCollapsibleGroup
												group={group}
												pathname={pathname}
												badges={badges}
											/>
										</div>
									) : (
										<div key={group.label} className={cn(groupIndex > 0 && "mt-3")}>
											{group.items.length > 1 && (
												<p className="text-muted-foreground mb-1.5 px-3 text-xs font-semibold tracking-wider uppercase">
													{group.label}
												</p>
											)}
											<ul className="space-y-0.5">
												{group.items.map((item) => {
													const isActive = isRouteActive(pathname, item.url);
													const badgeCount = badges?.[item.id];

													return (
														<li key={item.id}>
															<Link
																href={item.url}
																className={cn(
																	"relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
																	"motion-safe:active:scale-[0.97]",
																	isActive
																		? "bg-accent text-foreground before:bg-foreground font-semibold before:absolute before:top-1/2 before:left-0 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full"
																		: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
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
																<span className="flex-1">{item.shortTitle ?? item.title}</span>
																{badgeCount != null && badgeCount > 0 && (
																	<span
																		className="bg-primary text-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold"
																		aria-label={`${badgeCount} en attente`}
																	>
																		{badgeCount > 99 ? "99+" : badgeCount}
																	</span>
																)}
															</Link>
														</li>
													);
												})}
											</ul>
										</div>
									),
								)}
							</nav>
						</ScrollFade>
					</div>

					{/* Footer — safe area bottom for iOS home indicator */}
					<div className="space-y-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
						{/* User info */}
						<div className="flex items-center gap-3">
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">{user.name}</p>
								<p className="text-muted-foreground truncate text-xs">{user.email}</p>
							</div>
						</div>

						{/* Actions */}
						<div className="flex gap-2">
							<Link
								href="/"
								target="_blank"
								rel="noopener noreferrer"
								className={cn(
									"flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium",
									"hover:bg-accent/50 transition-colors",
									"motion-safe:active:scale-[0.97]",
									"focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
								)}
								aria-label="Voir le site (nouvel onglet)"
							>
								<ExternalLink className="size-4" aria-hidden="true" />
								Voir le site
							</Link>
							<button
								type="button"
								onClick={handleLogoutClick}
								className={cn(
									"flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium",
									"text-destructive hover:bg-destructive/10 transition-colors",
									"motion-safe:active:scale-95",
									"focus-visible:ring-destructive focus-visible:ring-2 focus-visible:outline-none",
								)}
							>
								<LogOut className="size-4" aria-hidden="true" />
								Déconnexion
							</button>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			<LogoutAlertDialog open={showLogout} onOpenChange={setShowLogout} />
		</>
	);
}

/** Hamburger button for use in header */
export function AdminMenuSheetTrigger({ className }: { className?: string }) {
	const { isOpen, open: openMenu, close: closeMenu } = useDialog("admin-menu-sheet");

	return (
		<button
			type="button"
			className={cn(
				"inline-flex items-center justify-center",
				"motion-safe:hover:scale-105 motion-safe:active:scale-95",
				"focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
				className,
			)}
			aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
			aria-haspopup="dialog"
			aria-expanded={isOpen}
			onClick={() => (isOpen ? closeMenu() : openMenu())}
		>
			<HamburgerIcon isOpen={isOpen} />
		</button>
	);
}
