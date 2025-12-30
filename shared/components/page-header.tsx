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
	/** Action(s) optionnelle(s) à afficher à droite du header (bouton, etc.) */
	actions?: ReactNode;
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
 * - Actions optionnelles à droite (responsive)
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
 * Dashboard compact (sans breadcrumbs)
 * ```tsx
 * <PageHeader
 *   title="Clients"
 *   description="Gérez vos clients"
 *   variant="compact"
 *   actions={<Button>Nouveau client</Button>}
 * />
 * ```
 */
export function PageHeader({
	title,
	description,
	breadcrumbs = [],
	actions,
	className,
	variant = "default",
}: PageHeaderProps) {
	const isCompact = variant === "compact";

	// Mode compact (dashboard) : pas de pt-16, pas de border-bottom, pas de breadcrumbs
	if (isCompact) {
		return (
			<header
				className={cn("space-y-6 mb-4 md:mb-6", className)}
				aria-labelledby="page-title"
			>
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
					<div className="min-w-0 flex-1 space-y-3">
						<h1
							id="page-title"
							className="text-3xl lg:text-4xl font-display font-medium tracking-wide text-foreground break-words"
							title={title}
						>
							{title}
						</h1>
						{description && (
							<p className="text-base lg:text-lg font-sans text-muted-foreground leading-relaxed max-w-prose break-words">
								{description}
							</p>
						)}
					</div>
					{actions && (
						<div
							role="group"
							aria-label="Actions de la page"
							className="shrink-0 w-full md:w-auto flex flex-wrap items-center justify-start md:justify-end gap-3"
						>
							{actions}
						</div>
					)}
				</div>
			</header>
		);
	}

	// Mode default (pages publiques) : background passe sous la navbar, contenu visible en dessous
	return (
		<header
			className={cn(
				"relative overflow-hidden bg-background border-b border-border",
				className
			)}
			aria-labelledby="page-title"
		>
			<div
				className={cn(
					"relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8",
					description
						? "pt-20 sm:pt-32 pb-2 sm:pb-4"
						: "pt-20 sm:pt-32 pb-0 sm:pb-4"
				)}
			>
				{/* Breadcrumb et titre principal */}
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
					<div className="min-w-0 flex-1">
						{/* Mobile avec breadcrumbs : Bouton retour + Titre + Actions inline */}
						{breadcrumbs.length > 0 && (
							<div className="flex items-center gap-1 sm:hidden">
								<Link
									href={
										breadcrumbs.length > 1
											? breadcrumbs[breadcrumbs.length - 2].href
											: "/"
									}
									className="shrink-0 inline-flex items-center justify-center size-11 -ml-3 text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
									aria-label={`Retour vers ${
										breadcrumbs.length > 1
											? breadcrumbs[breadcrumbs.length - 2].label
											: "Accueil"
									}`}
								>
									<ChevronLeft className="size-5" />
								</Link>
								<h1
									id="page-title"
									className="text-2xl font-display font-medium text-foreground tracking-normal truncate flex-1 min-w-0"
								>
									{title}
								</h1>
								{/* Actions mobile - alignées à droite */}
								{actions && (
									<div className="shrink-0 ml-auto">{actions}</div>
								)}
							</div>
						)}

						{/* Desktop : Breadcrumb complet avec schema.org (≥640px) */}
						{breadcrumbs.length > 0 && (
							<nav
								aria-label="Fil d'Ariane"
								className="hidden sm:block text-sm leading-normal text-muted-foreground mb-2"
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
												// Dernier élément = page active (pas de lien, mais schema.org complet)
												<>
													<span
														className="text-foreground font-medium"
														aria-current="page"
														itemProp="name"
													>
														{item.label}
													</span>
													<meta itemProp="item" content={item.href} />
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
						)}

						{/* Titre principal - SEO: toujours un h1 visible par les crawlers */}
						<h1
							id={breadcrumbs.length > 0 ? undefined : "page-title"}
							className={cn(
								"text-2xl sm:text-3xl font-display font-medium text-foreground tracking-normal break-words",
								breadcrumbs.length > 0 && "hidden sm:block"
							)}
						>
							{title}
						</h1>

						{/* Description optionnelle */}
						{description && (
							<p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl break-words">
								{description}
							</p>
						)}
					</div>

					{/* Actions - desktop ou mobile sans breadcrumbs */}
					{actions && (
						<div
							role="group"
							aria-label="Actions de la page"
							className={cn(
								"shrink-0 w-full sm:w-auto flex flex-wrap items-center justify-end gap-3",
								breadcrumbs.length > 0 && "hidden sm:flex"
							)}
						>
							{actions}
						</div>
					)}
				</div>
			</div>
		</header>
	);
}

// Re-export skeleton pour maintenir la compatibilité des imports existants
export { PageHeaderSkeleton } from "./page-header-skeleton";
