"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItemChild } from "@/shared/constants/navigation";
import { NavigationMenuLink } from "@/shared/components/ui/navigation-menu";
import { COLLECTION_IMAGE_QUALITY } from "@/modules/collections/constants/image-sizes.constants";
import { cn } from "@/shared/utils/cn";
import { ArrowRight, Gem } from "lucide-react";

interface MegaMenuCollectionsProps {
	collections?: NavItemChild[];
}

export function MegaMenuCollections({ collections }: MegaMenuCollectionsProps) {
	const pathname = usePathname();

	// Exclude "Toutes les collections" from cards (shown as CTA instead)
	const filteredCollections = collections?.filter(
		(c) => c.href !== "/collections",
	);

	if (!filteredCollections || filteredCollections.length === 0) {
		return null;
	}

	const isViewAllActive = pathname === "/collections";

	return (
		<div className="py-6">
			<h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Collections
			</h3>

			{/* CTA "Toutes les collections" */}
			<NavigationMenuLink asChild>
				<Link
					href="/collections"
					aria-current={isViewAllActive ? "page" : undefined}
					className={cn(
						"flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold min-h-11",
						"bg-accent/40 hover:bg-accent",
						"text-foreground",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
						"transition-colors duration-200 mb-4",
						isViewAllActive && "bg-accent font-semibold"
					)}
				>
					Toutes les collections
					<ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
				</Link>
			</NavigationMenuLink>

			{/* Collection cards with images */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				{filteredCollections.map((collection) => {
					const isActive = pathname === collection.href;
					const firstImage = collection.images?.[0];

					return (
						<NavigationMenuLink key={collection.href} asChild>
							<Link
								href={collection.href}
								aria-current={isActive ? "page" : undefined}
								className={cn(
									"group/card flex flex-col rounded-lg overflow-hidden",
									"ring-1 ring-border/50 hover:ring-border",
									"hover:shadow-sm",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									"transition-all duration-200",
									isActive && "ring-primary/50"
								)}
							>
								{/* Image thumbnail */}
								<div className="relative aspect-square bg-muted overflow-hidden">
									{firstImage ? (
										<Image
											src={firstImage.url}
											alt=""
											fill
											className="object-cover transition-transform duration-300 group-hover/card:scale-105"
											sizes="(min-width: 1024px) 200px, 150px"
											quality={COLLECTION_IMAGE_QUALITY}
											placeholder={firstImage.blurDataUrl ? "blur" : "empty"}
											blurDataURL={firstImage.blurDataUrl ?? undefined}
										/>
									) : (
										<div className="flex items-center justify-center size-full">
											<Gem className="size-6 text-muted-foreground/40" aria-hidden="true" />
										</div>
									)}
								</div>

								{/* Label */}
								<div className="px-3 py-2.5">
									<span className={cn(
										"text-sm",
										isActive ? "font-semibold text-foreground" : "font-medium text-foreground/80 group-hover/card:text-foreground"
									)}>
										{collection.label}
									</span>
									{collection.description && (
										<p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
											{collection.description}
										</p>
									)}
								</div>
							</Link>
						</NavigationMenuLink>
					);
				})}
			</div>
		</div>
	);
}
