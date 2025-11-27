"use client";

import type { NavItemWithChildren } from "@/shared/constants/navigation";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	navigationMenuTriggerStyle,
} from "@/shared/components/ui/navigation-menu";
import { useActiveNavbarItem } from "@/shared/hooks/use-active-navbar-item";
import { cn } from "@/shared/utils/cn";
import Link from "next/link";
import Image from "next/image";

/**
 * Navigation Desktop - Avec NavigationMenu
 *
 * Utilise NavigationMenu pour le comportement au survol:
 * ✅ Ouverture au hover (meilleure UX)
 * ✅ Animations fluides avec CSS pur (pas de Framer Motion)
 * ✅ Accessibilité native
 * ✅ Pattern standard pour navigation principale
 *
 * Performance optimisée:
 * - Bordure animée via CSS ::after au lieu de Framer Motion (-35KB bundle)
 * - Transitions GPU-accelerated avec transform
 *
 * @param navItems - Items de navigation générés dynamiquement avec collections
 */
interface DesktopNavProps {
	navItems: NavItemWithChildren[];
}

export function DesktopNav({ navItems }: DesktopNavProps) {
	const { isMenuItemActive } = useActiveNavbarItem();

	return (
		<NavigationMenu className="hidden lg:flex" viewport={true}>
			<NavigationMenuList className="gap-1">
				{navItems.map((item) => {
					const isActive = isMenuItemActive(item.href);
					const hasDropdown =
						item.hasDropdown && item.children && item.children.length > 0;

					// Item avec dropdown (Collections)
					if (hasDropdown) {
						return (
							<NavigationMenuItem key={item.href}>
								<NavigationMenuTrigger
									data-active={isActive}
									className={cn(
										"h-auto px-3 py-2 rounded-md text-sm font-medium tracking-normal relative overflow-visible",
										// Bordure bottom animée avec ::after
										"after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-secondary after:origin-center",
										"after:scale-x-0 after:transition-transform after:duration-200 after:ease-out",
										"hover:after:scale-x-100 data-[active=true]:after:scale-x-100"
									)}
								>
									{item.label}
								</NavigationMenuTrigger>
								<NavigationMenuContent>
									<ul className="grid w-full max-w-md sm:w-[420px] gap-2 p-3 bg-background/95 backdrop-blur-sm border border-border/50 shadow-lg rounded-lg">
										{item.children?.map((child) => {
											const isChildActive = isMenuItemActive(child.href);

											return (
												<li key={child.href}>
													<NavigationMenuLink asChild active={isChildActive}>
														<Link
															href={child.href}
															aria-current={isChildActive ? "page" : undefined}
															className={cn(
																"flex flex-row gap-3 p-4 rounded-md w-full overflow-hidden transition-all duration-200 border-l-2",
																isChildActive
																	? "font-medium bg-secondary/10 border-secondary"
																	: "border-transparent hover:bg-secondary/5 hover:border-secondary/50"
															)}
														>
															{child.imageUrl && (
																<Image
																	src={child.imageUrl}
																	alt={child.label}
																	width={64}
																	height={64}
																	className="w-16 h-16 object-cover rounded-md bg-secondary/20 shrink-0"
																	sizes="64px"
																	quality={85}
																/>
															)}
															<div className="flex flex-col gap-1.5 flex-1 min-w-0 overflow-hidden">
																<div className="flex items-center justify-between gap-2 min-w-0">
																	<span className="font-medium text-sm leading-tight truncate flex-1 min-w-0">
																		{child.label}
																	</span>
																	{child.badge && (
																		<span className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full font-semibold shrink-0 shadow-sm whitespace-nowrap">
																			{child.badge}
																		</span>
																	)}
																</div>
																{child.description && (
																	<p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed overflow-hidden wrap-break-words hyphens-auto">
																		{child.description}
																	</p>
																)}
															</div>
														</Link>
													</NavigationMenuLink>
												</li>
											);
										})}
									</ul>
								</NavigationMenuContent>
							</NavigationMenuItem>
						);
					}

					// Item simple (sans dropdown)
					return (
						<NavigationMenuItem key={item.href}>
							<NavigationMenuLink
								asChild
								active={isActive}
								className={cn(
									navigationMenuTriggerStyle(),
									"h-auto px-3 py-2 rounded-md text-sm font-medium tracking-normal relative overflow-visible",
									// Bordure bottom animée avec ::after
									"after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-secondary after:origin-center",
									"after:scale-x-0 after:transition-transform after:duration-200 after:ease-out",
									"hover:after:scale-x-100 data-[active=true]:after:scale-x-100"
								)}
							>
								<Link
									href={item.href}
									data-active={isActive}
									aria-current={isActive ? "page" : undefined}
								>
									{item.label}
								</Link>
							</NavigationMenuLink>
						</NavigationMenuItem>
					);
				})}
			</NavigationMenuList>
		</NavigationMenu>
	);
}
