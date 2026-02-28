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
			<header className={cn("mb-4 space-y-6 md:mb-6", className)} aria-labelledby="page-title">
				<div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
					<div className="min-w-0 flex-1 space-y-3">
						<h1
							id="page-title"
							className="font-display text-foreground wrap-break-words text-2xl font-medium tracking-normal sm:text-3xl lg:text-4xl"
							title={title}
						>
							{title}
						</h1>
						{description && (
							<p className="text-muted-foreground wrap-break-words max-w-prose font-sans text-base leading-relaxed lg:text-lg">
								{description}
							</p>
						)}
					</div>
					{actions && (
						<div
							role="group"
							aria-label="Actions de la page"
							className="flex w-full shrink-0 flex-wrap items-center justify-start gap-3 md:w-auto md:justify-end"
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
			className={cn("bg-background border-border relative overflow-hidden border-b", className)}
			aria-labelledby="page-title"
		>
			<div
				className={cn(
					"relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8",
					description ? "pt-20 pb-2 sm:pt-32 sm:pb-4" : "pt-20 pb-0 sm:pt-32 sm:pb-4",
				)}
			>
				{/* Breadcrumb et titre principal */}
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
					<div className="min-w-0 flex-1">
						{/* Mobile avec breadcrumbs : Bouton retour + Titre + Actions inline */}
						{breadcrumbs.length > 0 && (
							<div className="flex items-center gap-1 sm:hidden">
								<Link
									href={
										breadcrumbs.length > 1
											? (breadcrumbs[breadcrumbs.length - 2]?.href ?? "/")
											: "/"
									}
									className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -ml-3 inline-flex size-11 shrink-0 items-center justify-center rounded-md transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
									aria-label={`Retour vers ${
										breadcrumbs.length > 1
											? (breadcrumbs[breadcrumbs.length - 2]?.label ?? "Accueil")
											: "Accueil"
									}`}
								>
									<ChevronLeft className="size-5" />
								</Link>
								<span
									aria-hidden="true"
									className="font-display text-foreground wrap-break-words min-w-0 flex-1 text-2xl font-medium tracking-normal"
								>
									{title}
								</span>
								{/* Actions mobile - alignées à droite */}
								{actions && <div className="ml-auto shrink-0">{actions}</div>}
							</div>
						)}

						{/* Desktop : Breadcrumb complet (≥640px) — structured data via JSON-LD in page */}
						{breadcrumbs.length > 0 && (
							<nav
								aria-label="Fil d'Ariane"
								className="text-muted-foreground mb-2 hidden text-sm leading-normal sm:block"
							>
								<ol className="m-0 flex list-none items-center gap-2 p-0">
									<li>
										<Link
											href="/"
											className="hover:text-foreground focus-visible:ring-ring rounded-md transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
										>
											Accueil
										</Link>
									</li>

									{breadcrumbs.map((item, index) => (
										<li key={item.href} className="flex items-center gap-2">
											<span aria-hidden="true">/</span>
											{index === breadcrumbs.length - 1 ? (
												<span className="text-foreground font-medium" aria-current="page">
													{item.label}
												</span>
											) : (
												<Link
													href={item.href}
													className="hover:text-foreground focus-visible:ring-ring rounded-md transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
												>
													{item.label}
												</Link>
											)}
										</li>
									))}
								</ol>
							</nav>
						)}

						{/* Titre principal - SEO: h1 always in the DOM for mobile-first indexing */}
						<h1
							id="page-title"
							className={cn(
								"font-display text-foreground wrap-break-words text-2xl font-medium tracking-normal sm:text-3xl lg:text-4xl",
								breadcrumbs.length > 0 && "sr-only sm:not-sr-only",
							)}
						>
							{title}
						</h1>

						{/* Description optionnelle */}
						{description && (
							<p className="text-muted-foreground wrap-break-words mt-1 max-w-2xl text-base sm:mt-2">
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
								"flex w-full shrink-0 flex-wrap items-center justify-end gap-3 sm:w-auto",
								breadcrumbs.length > 0 && "hidden sm:flex",
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
