import Link from "next/link";
import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/shared/utils/cn";

interface BreadcrumbItem {
	label: string;
	href: string;
}

interface PageHeaderProps {
	/** Titre principal de la page (h1) */
	title: string;
	/** Description optionnelle sous le titre */
	description?: string;
	/** Chemin de navigation (breadcrumbs) - Accueil est toujours inclus automatiquement */
	breadcrumbs?: BreadcrumbItem[];
	/** Action optionnelle à afficher à droite du header (bouton, etc.) */
	action?: ReactNode;
	/** Actions multiples (pour dashboard) - alternative à action */
	actions?: ReactNode;
	/** Contenu de navigation optionnel affiché sous le header (ex: tabs, menu, etc.) */
	navigation?: ReactNode;
	/** Classes CSS additionnelles pour le conteneur */
	className?: string;
	/** Variant du header - default avec breadcrumbs, compact pour dashboard */
	variant?: "default" | "compact";
}

/**
 * Header standardisé pour toutes les pages (publiques, dashboard, protected)
 *
 * Pattern observé dans products/[slug], collections/[slug], contact
 * - Background remonte jusqu'en haut de la page (sous la navbar fixe pour effet visuel)
 * - Contenu avec pt-24 sm:pt-32 pour être visible sous la navbar (64/80px) + espacement
 * - Section avec border-bottom
 * - Breadcrumbs avec schema.org BreadcrumbList (rich snippets Google) - optionnel
 * - Titre h1 unique + description optionnelle
 * - Action optionnelle à droite (responsive)
 *
 * @example
 * Exemple basique (contact)
 * ```tsx
 * <PageHeader
 *   title="Contactez-nous"
 *   description="Une question ? Nous sommes là pour vous accompagner."
 *   breadcrumbs={[{ label: "Contact", href: "/contact" }]}
 * />
 * ```
 *
 * @example
 * Avec action slot (bouton "Effacer recherche")
 * ```tsx
 * <PageHeader
 *   title={`Recherche "${searchTerm}"`}
 *   description={collection.description}
 *   breadcrumbs={[
 *     { label: "Collections", href: "/collections" },
 *     { label: collection.name, href: `/collections/${slug}` }
 *   ]}
 *   action={
 *     <Button variant="outline" size="sm" asChild>
 *       <Link href={`/collections/${slug}`}>
 *         <X className="w-4 h-4 mr-2" />
 *         Effacer la recherche
 *       </Link>
 *     </Button>
 *   }
 * />
 * ```
 *
 * @example
 * Dashboard compact (sans breadcrumbs)
 * ```tsx
 * <PageHeader
 *   title="Clients"
 *   description="Gérez vos clients"
 *   variant="compact"
 *   actions={
 *     <Button>Nouveau client</Button>
 *   }
 * />
 * ```
 */
export function PageHeader({
	title,
	description,
	breadcrumbs = [],
	action,
	actions,
	navigation,
	className,
	variant = "default",
}: PageHeaderProps) {
	const isCompact = variant === "compact";
	const displayActions = actions || action;

	// Mode compact (dashboard) : pas de pt-16, pas de border-bottom, pas de breadcrumbs
	if (isCompact) {
		return (
			<header
				className={cn("space-y-6 mb-4 lg:mb-6", className)}
				aria-labelledby="page-title"
			>
				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
					<div className="min-w-0 flex-1 space-y-3">
						<h1
							id="page-title"
							className="text-3xl lg:text-4xl font-display font-semibold tracking-wide text-foreground wrap-break-words"
							title={title}
						>
							{title}
						</h1>
						{description && (
							<p className="text-base lg:text-lg font-sans text-muted-foreground leading-relaxed max-w-prose wrap-break-words line-clamp-2 md:line-clamp-none overflow-hidden">
								{description}
							</p>
						)}
					</div>
					{displayActions && (
						<div className="shrink-0 w-full lg:w-auto flex flex-wrap items-center justify-end gap-3 max-w-md">
							{displayActions}
						</div>
					)}
				</div>
			</header>
		);
	}

	// Mode default (pages publiques) : background passe sous la navbar, contenu visible en dessous
	return (
		<div className={className}>
			{/* Header avec contexte - Background simple sans animations */}
			<section
				className={cn(
					"relative overflow-hidden bg-background",
					!navigation && "border-b border-border"
				)}
			>
				<div
					className={cn(
						"relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8",
						navigation ? "pt-24 sm:pt-28 pb-3" : "pt-24 sm:pt-32 pb-6"
					)}
				>
					{/* Breadcrumb et titre principal */}
					<div
						className={cn(
							"flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4",
							!navigation && "mb-6"
						)}
					>
						<div className="space-y-2">
							{/* Breadcrumb - Version mobile : Bouton retour compact */}
							{breadcrumbs.length > 0 && (
								<>
									{/* Mobile : Bouton retour simple (<640px) */}
									<nav
										aria-label="Fil d'Ariane"
										className="sm:hidden text-sm leading-normal"
									>
										<Link
											href={
												breadcrumbs.length > 1
													? breadcrumbs[breadcrumbs.length - 2].href
													: "/"
											}
											className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
										>
											<ChevronLeft className="w-4 h-4" />
											<span>
												{breadcrumbs.length > 1
													? breadcrumbs[breadcrumbs.length - 2].label
													: "Accueil"}
											</span>
										</Link>
									</nav>

									{/* Desktop : Breadcrumb complet avec schema.org (≥640px) */}
									<nav
										aria-label="Fil d'Ariane"
										className="hidden sm:block text-sm leading-normal text-muted-foreground"
										itemScope
										itemType="https://schema.org/BreadcrumbList"
									>
										<ol className="flex items-center gap-2 list-none p-0 m-0">
											{/* Accueil (position 1) */}
											<li
												itemProp="itemListElement"
												itemScope
												itemType="https://schema.org/ListItem"
											>
												<Link
													href="/"
													className="hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
													itemProp="item"
												>
													<span itemProp="name">Accueil</span>
												</Link>
												<meta itemProp="position" content="1" />
											</li>

											{/* Breadcrumbs dynamiques (position 2+) */}
											{breadcrumbs.map((item, index) => (
												<li
													key={`${item.href}-${index}`}
													className="flex items-center gap-2"
													itemProp="itemListElement"
													itemScope
													itemType="https://schema.org/ListItem"
												>
													<span aria-hidden="true">/</span>
													{index === breadcrumbs.length - 1 ? (
														// Dernier élément = page active (pas de lien, mais schema.org name)
														<>
															<span
																className="text-foreground font-medium"
																aria-current="page"
																itemProp="name"
															>
																{item.label}
															</span>
															<meta
																itemProp="position"
																content={String(index + 2)}
															/>
														</>
													) : (
														// Éléments intermédiaires = liens avec schema.org
														<>
															<Link
																href={item.href}
																className="hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
																itemProp="item"
															>
																<span itemProp="name">{item.label}</span>
															</Link>
															<meta
																itemProp="position"
																content={String(index + 2)}
															/>
														</>
													)}
												</li>
											))}
										</ol>
									</nav>
								</>
							)}

							{/* Titre */}
							<h1
								id="page-title"
								className="text-2xl sm:text-3xl font-display font-semibold text-foreground tracking-normal wrap-break-words"
							>
								{title}
							</h1>

							{/* Description optionnelle */}
							{description && (
								<p className="text-base text-muted-foreground max-w-2xl wrap-break-words">
									{description}
								</p>
							)}
						</div>

						{/* Action optionnelle (ex: bouton, recherche) */}
						{displayActions && <div className="shrink-0">{displayActions}</div>}
					</div>
				</div>
			</section>

			{/* Contenu de navigation optionnel (ex: tabs, menu, etc.) */}
			{navigation && (
				<div className="relative overflow-hidden bg-background border-b border-border">
					<div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
						{navigation}
					</div>
				</div>
			)}
		</div>
	);
}

/**
 * Skeleton pour le PageHeader - à utiliser dans les fichiers loading.tsx
 */
export function PageHeaderSkeleton({
	variant = "default",
}: {
	variant?: "default" | "compact";
}) {
	if (variant === "compact") {
		return (
			<div className="space-y-6 mb-4 lg:mb-6 animate-pulse">
				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
					<div className="min-w-0 flex-1 space-y-3">
						<div className="h-9 w-48 bg-muted rounded" />
						<div className="h-5 w-72 bg-muted rounded" />
					</div>
				</div>
			</div>
		);
	}

	return (
		<section className="relative overflow-hidden bg-background border-b border-border">
			<div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-6 animate-pulse">
				<div className="space-y-2">
					<div className="h-4 w-32 bg-muted rounded hidden sm:block" />
					<div className="h-8 w-64 bg-muted rounded" />
					<div className="h-5 w-96 max-w-full bg-muted rounded" />
				</div>
			</div>
		</section>
	);
}
