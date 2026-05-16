"use client";

import { isRouteActive } from "@/shared/lib/navigation";
import { cn } from "@/shared/utils/cn";
import Link from "next/link";
import type { NavItem } from "./navigation-config";

interface AdminMenuQuickAccessProps {
	items: NavItem[];
	pathname: string;
	badges?: Record<string, number>;
}

export function AdminMenuQuickAccess({ items, pathname, badges }: AdminMenuQuickAccessProps) {
	if (items.length === 0) return null;

	return (
		<div className="px-4 pt-3 pb-1">
			<p className="text-muted-foreground mb-2 px-1 text-xs font-semibold tracking-wider uppercase">
				Accès rapide
			</p>
			<div className="grid grid-cols-3 gap-2">
				{items.map((item) => {
					const isActive = isRouteActive(pathname, item.url);
					const badgeCount = badges?.[item.id];

					return (
						<Link
							key={item.id}
							href={item.url}
							className={cn(
								"relative flex min-h-[60px] flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-center transition-colors",
								"motion-safe:active:scale-[0.97]",
								isActive
									? "bg-accent text-foreground font-semibold"
									: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
								"focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
							)}
							aria-current={isActive ? "page" : undefined}
						>
							<span className="relative">
								<item.icon
									className={cn("size-6", isActive ? "text-foreground" : "text-muted-foreground")}
									aria-hidden="true"
								/>
								{badgeCount != null && badgeCount > 0 && (
									<span
										className="bg-primary text-primary-foreground text-2xs absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-bold"
										aria-label={`${badgeCount} en attente`}
									>
										{badgeCount > 99 ? "99+" : badgeCount}
									</span>
								)}
							</span>
							<span className="max-w-full truncate text-xs font-medium">
								{item.shortTitle ?? item.title}
							</span>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
