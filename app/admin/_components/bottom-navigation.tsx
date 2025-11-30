"use client";

import { cn } from "@/shared/utils/cn";
import {
	LayoutDashboard,
	MoreHorizontal,
	Package,
	ShoppingBag,
	ReceiptText,
	Layers,
	Tag,
	Palette,
	Mail,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/shared/components/ui/sheet";

interface NavItem {
	label: string;
	shortLabel: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
	{
		label: "Tableau de bord",
		shortLabel: "Accueil",
		href: "/admin",
		icon: LayoutDashboard,
	},
	{
		label: "Commandes",
		shortLabel: "Commandes",
		href: "/admin/ventes/commandes",
		icon: ShoppingBag,
	},
	{
		label: "Produits",
		shortLabel: "Produits",
		href: "/admin/catalogue/produits",
		icon: Package,
	},
	{
		label: "Plus",
		shortLabel: "Plus",
		href: "#more",
		icon: MoreHorizontal,
	},
];

// Items secondaires affichés dans le Sheet "Plus"
const moreItems: NavItem[] = [
	{
		label: "Remboursements",
		shortLabel: "Remboursements",
		href: "/admin/ventes/remboursements",
		icon: ReceiptText,
	},
	{
		label: "Collections",
		shortLabel: "Collections",
		href: "/admin/catalogue/collections",
		icon: Layers,
	},
	{
		label: "Types de produits",
		shortLabel: "Types",
		href: "/admin/catalogue/types-de-produits",
		icon: Tag,
	},
	{
		label: "Couleurs",
		shortLabel: "Couleurs",
		href: "/admin/catalogue/couleurs",
		icon: Palette,
	},
	{
		label: "Newsletter",
		shortLabel: "Newsletter",
		href: "/admin/marketing/newsletter",
		icon: Mail,
	},
	{
		label: "Utilisateurs",
		shortLabel: "Utilisateurs",
		href: "/admin/utilisateurs",
		icon: Users,
	},
];

/**
 * Bottom Navigation pour mobile
 * Visible uniquement sur écrans < 768px (md breakpoint)
 * Position fixed en bas de l'écran avec backdrop-blur
 */
export function BottomNavigation() {
	const pathname = usePathname();

	// Vérifie si une page du menu "Plus" est active
	const isMoreItemActive = moreItems.some(
		(item) => pathname === item.href || pathname.startsWith(item.href + "/")
	);

	return (
		<nav
			className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-lg supports-backdrop-filter:bg-background/60"
			aria-label="Navigation mobile principale"
		>
			<div className="flex items-center justify-around h-16 px-2 safe-area-inset-bottom">
				{navItems.map((item) => {
					const Icon = item.icon;
					// Considérer actif si URL exacte ou commence par l'URL (sauf pour "Plus")
					const isActive =
						item.href !== "#more" &&
						(pathname === item.href || pathname.startsWith(item.href + "/"));

					// Pour "Plus", ouvrir le drawer avec navigation secondaire
					if (item.href === "#more") {
						return (
							<Sheet key={item.label}>
								<SheetTrigger asChild>
									<button
										type="button"
										className={cn(
											"flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg min-w-[64px] relative",
											"motion-safe:transition-colors motion-safe:transition-transform",
											isMoreItemActive
												? "text-primary"
												: "text-muted-foreground hover:text-foreground hover:bg-accent/50",
											"motion-safe:active:scale-95"
										)}
										aria-label="Voir plus d'options"
									>
										{/* Indicateur actif si une page du menu "Plus" est active */}
										{isMoreItemActive && (
											<span
												className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-12 bg-primary rounded-full"
												aria-hidden="true"
											/>
										)}
										<Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
										<span className="text-xs font-medium leading-none">
											{item.shortLabel}
										</span>
									</button>
								</SheetTrigger>
								<SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-xl">
									<SheetHeader className="pb-4">
										<SheetTitle>Plus d'options</SheetTitle>
									</SheetHeader>
									<nav aria-label="Navigation secondaire">
										<ul className="grid grid-cols-3 gap-2">
											{moreItems.map((moreItem) => {
												const MoreIcon = moreItem.icon;
												const isMoreActive =
													pathname === moreItem.href ||
													pathname.startsWith(moreItem.href + "/");

												return (
													<li key={moreItem.label}>
														<Link
															href={moreItem.href}
															className={cn(
																"flex flex-col items-center justify-center gap-2 p-3 rounded-lg relative",
																"motion-safe:transition-all motion-safe:active:scale-95",
																"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
																isMoreActive
																	? "bg-primary/10 text-primary"
																	: "text-muted-foreground hover:text-foreground hover:bg-accent/50"
															)}
															aria-current={isMoreActive ? "page" : undefined}
														>
															{/* Indicateur actif */}
															{isMoreActive && (
																<span
																	className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-primary rounded-full"
																	aria-hidden="true"
																/>
															)}
															<MoreIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
															<span className="text-xs font-medium text-center leading-tight">
																{moreItem.shortLabel}
															</span>
														</Link>
													</li>
												);
											})}
										</ul>
									</nav>
								</SheetContent>
							</Sheet>
						);
					}

					return (
						<Link
							key={item.label}
							href={item.href}
							className={cn(
								"flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg min-w-[64px] relative",
								"motion-safe:transition-all motion-safe:active:scale-95",
								isActive
									? "text-primary"
									: "text-muted-foreground hover:text-foreground hover:bg-accent/50"
							)}
							aria-label={item.label}
							aria-current={isActive ? "page" : undefined}
						>
							{/* Indicateur actif (border top) */}
							{isActive && (
								<span
									className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-12 bg-primary rounded-full"
									aria-hidden="true"
								/>
							)}
							<Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
							<span className="text-xs font-medium leading-none">
								{item.shortLabel}
							</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
