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
import { cormorantGaramond } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { ExternalLink, LogOut } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navigationData } from "./navigation-config";
import { getInitials } from "./sidebar-footer-user";

interface AdminMenuSheetProps {
	user: {
		name: string;
		email: string;
		avatar?: string;
	};
}

const itemVariants = {
	hidden: { opacity: 0, x: -8 },
	visible: { opacity: 1, x: 0 },
};

export function AdminMenuSheet({ user }: AdminMenuSheetProps) {
	const { isOpen, open: openMenu, close: closeMenu } = useDialog("admin-menu-sheet");
	const [showLogout, setShowLogout] = useState(false);
	const pathname = usePathname();
	const prefersReducedMotion = useReducedMotion();
	useEdgeSwipe(openMenu, isOpen, 768);

	// Close on navigation
	useEffect(() => {
		if (isOpen) closeMenu();
	}, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

	function handleLogoutClick() {
		closeMenu();
		setTimeout(() => setShowLogout(true), 150);
	}

	return (
		<>
			<Sheet
				direction="left"
				open={isOpen}
				onOpenChange={(open) => (open ? openMenu() : closeMenu())}
				preventScrollRestoration
			>
				<SheetContent className="bg-background/95 flex w-[min(88vw,340px)] flex-col border-r p-0! sm:w-80 sm:max-w-md">
					<SheetHeader className="sr-only p-0!">
						<SheetTitle>Menu d&apos;administration</SheetTitle>
						<SheetDescription>Navigation du tableau de bord administrateur</SheetDescription>
					</SheetHeader>

					{/* Header */}
					<div className="flex items-center gap-3 border-b px-5 py-4">
						<Logo size={36} rounded="lg" />
						<span
							className={cn(cormorantGaramond.className, "text-lg font-semibold tracking-wide")}
						>
							{BRAND.name}
						</span>
					</div>

					{/* Scrollable nav */}
					<div className="min-h-0 flex-1">
						<ScrollFade axis="vertical" className="h-full" hideScrollbar={false}>
							<nav aria-label="Navigation administration" className="px-3 py-3">
								{navigationData.navGroups.map((group, groupIndex) => (
									<div key={group.label} className={cn(groupIndex > 0 && "mt-4")}>
										<p className="text-muted-foreground mb-1.5 px-3 text-xs font-semibold tracking-wider uppercase">
											{group.label}
										</p>
										<ul className="space-y-0.5">
											{group.items.map((item, itemIndex) => {
												const isActive = isRouteActive(pathname, item.url);

												return (
													<m.li
														key={item.id}
														variants={prefersReducedMotion ? undefined : itemVariants}
														initial={prefersReducedMotion ? false : "hidden"}
														animate={isOpen ? "visible" : "hidden"}
														transition={
															prefersReducedMotion
																? { duration: 0 }
																: {
																		delay: groupIndex * 0.05 + itemIndex * 0.03,
																		duration: 0.2,
																	}
														}
													>
														<Link
															href={item.url}
															className={cn(
																"relative flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
																isActive
																	? "bg-accent/50 text-foreground before:bg-primary font-semibold before:absolute before:top-1/2 before:left-0 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full"
																	: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
															)}
															aria-current={isActive ? "page" : undefined}
														>
															<span>{item.title}</span>
														</Link>
													</m.li>
												);
											})}
										</ul>
									</div>
								))}
							</nav>
						</ScrollFade>
					</div>

					{/* Footer */}
					<div className="space-y-3 border-t px-4 py-3">
						{/* User info */}
						<div className="flex items-center gap-3">
							<Avatar className="size-9 rounded-lg">
								{user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
								<AvatarFallback className="rounded-lg text-xs">
									{getInitials(user.name)}
								</AvatarFallback>
							</Avatar>
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
									"flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
									"hover:bg-accent/50 transition-colors",
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
									"flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
									"text-destructive hover:bg-destructive/10 transition-colors",
									"focus-visible:ring-destructive focus-visible:ring-2 focus-visible:outline-none",
								)}
								aria-label="Déconnexion"
							>
								<LogOut className="size-4" aria-hidden="true" />
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
