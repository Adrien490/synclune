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
import { ArrowRight } from "lucide-react";
import { COLLECTION_IMAGE_SIZES, COLLECTION_IMAGE_QUALITY } from "@/modules/collections/constants/image-sizes.constants";

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

/** Classes communes pour les items de navigation avec bordure animee */
const navItemBaseClasses = cn(
	"h-auto px-3 py-2 rounded-md text-sm font-medium tracking-normal relative overflow-visible",
	"transition-all duration-300 ease-out",
	"group-data-[scrolled=true]:px-2.5 group-data-[scrolled=true]:py-1.5"
);

/** Bordure bottom animee avec ::after */
const animatedBorderClasses = cn(
	"after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0",
	"after:h-1 after:bg-primary after:origin-center",
	"after:scale-x-0 after:transition-transform after:duration-200 after:ease-out",
	"hover:after:scale-x-100 data-[active=true]:after:scale-x-100"
);

export function DesktopNav({ navItems }: DesktopNavProps) {
	const { isMenuItemActive } = useActiveNavbarItem();

	return (
		<NavigationMenu className="hidden lg:flex" viewport={true} delayDuration={200}>
			<NavigationMenuList className="gap-1 transition-all duration-300 group-data-[scrolled=true]:gap-0.5">
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
									className={cn(navItemBaseClasses, animatedBorderClasses)}
								>
									{item.label}
								</NavigationMenuTrigger>
								<NavigationMenuContent>
									<ul className="grid w-full max-w-[calc(100vw-2rem)] sm:w-[420px] sm:max-w-md gap-2 p-3 bg-background/95 backdrop-blur-sm border border-border/50 shadow-lg rounded-lg">
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
																	? "font-medium bg-primary/10 border-primary"
																	: "border-transparent hover:bg-primary/5 hover:border-primary/50"
															)}
														>
															{child.imageUrl ? (
																<Image
																	src={child.imageUrl}
																	alt={`Collection ${child.label}`}
																	width={64}
																	height={64}
																	className="w-16 h-16 object-cover rounded-md bg-secondary/20 shrink-0"
																	sizes={COLLECTION_IMAGE_SIZES.MENU_DESKTOP}
																	quality={COLLECTION_IMAGE_QUALITY}
																	placeholder={child.blurDataUrl ? "blur" : "empty"}
																	blurDataURL={child.blurDataUrl ?? undefined}
																/>
															) : (
																<div
																	className="w-16 h-16 rounded-md bg-secondary/20 shrink-0 flex items-center justify-center"
																	aria-hidden="true"
																>
																	<svg
																		className="w-6 h-6 text-muted-foreground/50"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			strokeWidth={1.5}
																			d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
																		/>
																	</svg>
																</div>
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
																	<p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed overflow-hidden break-words">
																		{child.description}
																	</p>
																)}
															</div>
														</Link>
													</NavigationMenuLink>
												</li>
											);
										})}
										{/* CTA View All - Baymard UX */}
										<li className="border-t border-border/30 mt-2 pt-2">
											<NavigationMenuLink asChild>
												<Link
													href="/collections"
													className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
												>
													<ArrowRight className="h-4 w-4" aria-hidden="true" />
													Voir toutes les collections
												</Link>
											</NavigationMenuLink>
										</li>
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
									navItemBaseClasses,
									animatedBorderClasses
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
