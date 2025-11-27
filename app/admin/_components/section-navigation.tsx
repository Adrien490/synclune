import { PageHeader } from "@/shared/components/page-header";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface NavigationLink {
	title: string;
	description?: string;
	href: string;
	icon?: LucideIcon;
	badge?: string;
}

interface SectionNavigationProps {
	title: string;
	description?: string;
	links: NavigationLink[];
	columns?: 1 | 2 | 3;
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
		<>
			<PageHeader title={title} description={description} />
			<div className={cn("grid gap-4", gridCols[columns])}>
				{links.map((link) => {
					const Icon = link.icon;
					return (
						<Link key={link.href} href={link.href}>
							<Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
								<CardHeader>
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-3">
											{Icon && (
												<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
													<Icon className="h-5 w-5 text-primary" />
												</div>
											)}
											<div>
												<CardTitle className="text-lg">{link.title}</CardTitle>
												{link.description && (
													<CardDescription className="mt-1">
														{link.description}
													</CardDescription>
												)}
											</div>
										</div>
										{link.badge && (
											<span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
												{link.badge}
											</span>
										)}
									</div>
								</CardHeader>
							</Card>
						</Link>
					);
				})}
			</div>
		</>
	);
}
