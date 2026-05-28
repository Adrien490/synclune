"use client";

import { PageHeader } from "@/shared/components/page-header";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardDescription, CardHeader } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface NavigationLink {
	title: string;
	description?: string;
	href: string;
	icon?: ReactNode;
	badge?: string;
}

interface SectionNavigationProps {
	title: string;
	description?: string;
	links: NavigationLink[];
	columns?: 1 | 2 | 3;
}

const GRID_COLS = {
	1: "grid-cols-1",
	2: "grid-cols-1 md:grid-cols-2",
	3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
} as const satisfies Record<1 | 2 | 3, string>;

export function SectionNavigation({
	title,
	description,
	links,
	columns = 2,
}: SectionNavigationProps) {
	return (
		<nav aria-label={title}>
			<PageHeader
				variant="compact"
				title={title}
				description={description}
				className="hidden md:block"
			/>

			{/* Mobile : description seule (titre couvert par AdminMobileHeader) */}
			{description && (
				<p className="text-muted-foreground mb-4 text-sm text-pretty md:hidden">{description}</p>
			)}

			<div className={cn("grid gap-4", GRID_COLS[columns])}>
				{links.map((link) => (
					<Link key={link.href} href={link.href} className="focus-ring block rounded-lg">
						<Card
							className={cn(
								"group relative h-full",
								"can-hover:hover:shadow-md can-hover:hover:border-primary/50 can-hover:hover:-translate-y-0.5",
								"motion-safe:transition-all motion-safe:duration-200",
								"motion-safe:active:scale-[0.98]",
							)}
						>
							<CardHeader>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-3">
										{link.icon && (
											<div className="bg-primary/15 text-primary border-primary/30 can-hover:group-hover:scale-110 flex size-10 items-center justify-center rounded-lg border transition-transform duration-300">
												{link.icon}
											</div>
										)}
										<div>
											<h3 className="font-display text-lg leading-none font-normal">
												{link.title}
											</h3>
											{link.description && (
												<CardDescription className="mt-1">{link.description}</CardDescription>
											)}
										</div>
									</div>
									<div className="flex shrink-0 items-center gap-2">
										{link.badge && <Badge variant="secondary">{link.badge}</Badge>}
										<ChevronRight
											className="text-muted-foreground/70 group-hover:text-primary size-5 shrink-0 transition-[transform,color] group-hover:translate-x-0.5"
											aria-hidden="true"
										/>
									</div>
								</div>
							</CardHeader>
						</Card>
					</Link>
				))}
			</div>
		</nav>
	);
}
