"use client";

import { PageHeader } from "@/shared/components/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
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

/**
 * Slugify simple pour `viewTransitionName` (alphanumérique uniquement).
 * Permet le morph natif card → page enfant si la page enfant définit
 * le même nom sur son hero/header.
 */
function viewTransitionSlug(href: string): string {
	return `section-card-${href
		.replace(/[^a-z0-9]/gi, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")}`;
}

export function SectionNavigation({
	title,
	description,
	links,
	columns = 2,
}: SectionNavigationProps) {
	const gridCols = {
		1: "grid-cols-1",
		2: "grid-cols-1 md:grid-cols-2",
		3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
	};

	return (
		<section aria-label={title}>
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

			<div className={cn("grid gap-4", gridCols[columns])}>
				{links.map((link) => (
					<Link
						key={link.href}
						href={link.href}
						className="focus-visible:ring-primary rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					>
						<Card
							className={cn(
								"can-hover:hover:shadow-md can-hover:hover:border-primary/50 h-full",
								"motion-safe:transition-all motion-safe:duration-200",
								"active:scale-[0.98]",
							)}
							style={{ viewTransitionName: viewTransitionSlug(link.href) }}
						>
							<CardHeader>
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										{link.icon && (
											<div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
												{link.icon}
											</div>
										)}
										<div>
											<CardTitle className="text-lg">{link.title}</CardTitle>
											{link.description && (
												<CardDescription className="mt-1">{link.description}</CardDescription>
											)}
										</div>
									</div>
									{link.badge && (
										<span className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs font-medium">
											{link.badge}
										</span>
									)}
								</div>
							</CardHeader>
						</Card>
					</Link>
				))}
			</div>
		</section>
	);
}
