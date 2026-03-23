"use client";

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { isRouteActive } from "@/shared/lib/navigation";
import { cn } from "@/shared/utils/cn";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { NavGroup } from "./navigation-config";

interface AdminMenuCollapsibleGroupProps {
	group: NavGroup;
	pathname: string;
	badges?: Record<string, number>;
}

export function AdminMenuCollapsibleGroup({
	group,
	pathname,
	badges,
}: AdminMenuCollapsibleGroupProps) {
	const hasActiveItem = group.items.some((item) => isRouteActive(pathname, item.url));
	const groupId = `mobile-nav-${group.label.toLowerCase().replace(/\s+/g, "-")}`;

	return (
		<Collapsible defaultOpen={hasActiveItem} className="group/collapsible">
			<div role="group" aria-labelledby={groupId}>
				<CollapsibleTrigger
					className={cn(
						"flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold tracking-wider uppercase",
						"text-muted-foreground hover:text-foreground cursor-pointer transition-colors",
						"motion-safe:active:scale-[0.98]",
						"focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
						"min-h-[44px]",
					)}
					id={groupId}
				>
					<span className="flex-1 text-left">{group.label}</span>
					<ChevronRight
						className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
						aria-hidden="true"
					/>
				</CollapsibleTrigger>
				<CollapsibleContent className="motion-safe:data-[state=closed]:animate-collapse-up motion-safe:data-[state=open]:animate-collapse-down overflow-hidden">
					<ul className="space-y-0.5 pb-1">
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
				</CollapsibleContent>
			</div>
		</Collapsible>
	);
}
