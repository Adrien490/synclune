import Link from "next/link";
import { type ReactNode } from "react";
import { CaretLeftIcon } from "@phosphor-icons/react/ssr";
import { GuardedLink } from "@/shared/components/navigation/guarded-link";

import { SITE_URL } from "@/shared/constants/seo-config";
import { cn } from "@/shared/utils/cn";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";

interface BreadcrumbItem {
	label: string;
	href: string;
}

const EMPTY_BREADCRUMBS: BreadcrumbItem[] = [];

interface PageHeaderProps {
	/** Titre principal de la page (h1) */
	title: string;
	/** Description optionnelle sous le titre */
	description?: string;
	/** Chemin de navigation (breadcrumbs) - Accueil est toujours inclus automatiquement */
	breadcrumbs?: BreadcrumbItem[];
	/** Action(s) optionnelle(s) à afficher à droite du header (bouton, etc.) */
	actions?: ReactNode;
	/** Classes CSS additionnelles pour le titre h1 (font, taille, couleur…) */
	titleClassName?: string;
	/** Classes CSS additionnelles pour la description */
	descriptionClassName?: string;
	/** Classes CSS additionnelles pour le conteneur */
	className?: string;
	/** Variant du header - default avec breadcrumbs, compact pour dashboard */
	variant?: "default" | "compact";
	/**
	 * Désactive l'émission automatique du `<script application/ld+json>` BreadcrumbList.
	 * Utiliser sur pages noindex (admin) ou quand la page rend son propre schéma.
	 * Default: false (JSON-LD émis si variant=default + breadcrumbs.length > 0).
	 */
	noStructuredData?: boolean;
}

/**
 * Header standardisé des pages LÉGALES et de l'ADMIN.
 *
 * ⚠️ **Plus un composant storefront.** Depuis l'harmonisation sur « L'étal
 * continue » (2026-08-05), les pages boutique (/produits, /collections,
 * /favoris, PDP) montent `StorefrontHeading` + `BreadcrumbNav`
 * (`shared/components/`) — pas de bande border-b, h1 visible à tous les
 * viewports. Son périmètre restant : `app/(legal)/*` (mode default) et
 * l'admin (`variant="compact"`).
 *
 * - Background remonte jusqu'en haut de la page (sous la navbar fixe `var(--navbar-height)` 4rem/5rem)
 * - Contenu avec `pt-20 sm:pt-32` (compense navbar 64/80px + marge respiration)
 * - Section avec border-bottom
 * - Breadcrumbs avec schema.org BreadcrumbList (rich snippets Google) — JSON-LD émis
 *   automatiquement par le composant, opt-out via `noStructuredData` (les pages
 *   légales comptent sur cette émission par défaut)
 * - Titre h1 unique + description optionnelle
 * - Actions optionnelles à droite (responsive)
 *
 * @example
 * Page légale
 * ```tsx
 * <PageHeader
 *   title="Conditions générales de vente"
 *   breadcrumbs={[{ label: "CGV", href: "/cgv" }]}
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
	breadcrumbs = EMPTY_BREADCRUMBS,
	actions,
	titleClassName,
	descriptionClassName,
	className,
	variant = "default",
	noStructuredData = false,
}: PageHeaderProps) {
	const isCompact = variant === "compact";

	// Mode compact (dashboard) : pas de pt-16, pas de border-bottom, pas de breadcrumbs
	if (isCompact) {
		return (
			<header className={cn("mb-4 space-y-6 md:mb-6", className)} aria-labelledby="page-title">
				<div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-start md:justify-between">
					<div className="min-w-0 flex-1 gap-y-3">
						<h1
							id="page-title"
							className={cn(
								"font-display text-foreground wrap-break-words text-2xl leading-tight font-normal tracking-normal sm:text-3xl lg:text-4xl",
								titleClassName,
							)}
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
							className="flex w-full shrink-0 flex-wrap items-center justify-start gap-3 md:mt-1 md:w-auto md:justify-end"
						>
							{actions}
						</div>
					)}
				</div>
			</header>
		);
	}

	const shouldEmitStructuredData = breadcrumbs.length > 0 && !noStructuredData;

	// Mode default (pages publiques) : background passe sous la navbar, contenu visible en dessous
	return (
		<>
			{shouldEmitStructuredData && (
				<script
					type="application/ld+json"
					// SAFE: serialized via safeJsonLd (escape <, >, &)
					dangerouslySetInnerHTML={{
						__html: safeJsonLd({
							"@context": "https://schema.org",
							"@type": "BreadcrumbList",
							itemListElement: [
								{
									"@type": "ListItem",
									position: 1,
									name: "Accueil",
									item: SITE_URL,
								},
								...breadcrumbs.map((item, index) => ({
									"@type": "ListItem",
									position: index + 2,
									name: item.label,
									item: `${SITE_URL}${item.href}`,
								})),
							],
						}),
					}}
				/>
			)}
			<header
				className={cn("bg-background border-border relative overflow-hidden border-b", className)}
				aria-labelledby="page-title"
			>
				<div className="relative mx-auto max-w-6xl px-4 pt-20 pb-2 sm:px-6 sm:pt-32 sm:pb-4 lg:px-8">
					{/* Breadcrumb et titre principal */}
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
						<div className="min-w-0 flex-1">
							{/* Mobile avec breadcrumbs : Bouton retour + Titre + Actions inline */}
							{breadcrumbs.length > 0 && (
								<div className="flex items-center gap-1 sm:hidden">
									{/* GuardedLink : sortie la plus probable d'un formulaire admin dirty. */}
									<GuardedLink
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
										<CaretLeftIcon className="size-5" />
									</GuardedLink>
									<span
										aria-hidden="true"
										className="font-display text-foreground wrap-break-words min-w-0 flex-1 text-2xl font-normal tracking-normal"
									>
										{title}
									</span>
									{/* Actions mobile - alignées à droite */}
									{actions && <div className="ml-auto shrink-0">{actions}</div>}
								</div>
							)}

							{/* Desktop : Breadcrumb complet (≥640px) — JSON-LD émis ci-dessus */}
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
									"font-display text-foreground wrap-break-words text-2xl font-normal tracking-normal sm:text-3xl lg:text-4xl",
									breadcrumbs.length > 0 && "sr-only sm:not-sr-only",
									titleClassName,
								)}
							>
								{title}
							</h1>

							{/* Plus d'accent « fait main » ici : la prop `accent` n'était passée
							    par AUCUN des ~60 appelants (legal + admin) — branche morte purgée
							    au lot 0 de l'audit HandDrawnAccent (2026-08-05). Le storefront,
							    seul territoire du geste, passe par StorefrontHeading. */}

							{/* Description optionnelle */}
							{description && (
								<p
									className={cn(
										"text-muted-foreground wrap-break-words mt-1 max-w-2xl text-base leading-relaxed sm:mt-2 lg:text-lg",
										descriptionClassName,
									)}
								>
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
		</>
	);
}

// Re-export skeleton pour maintenir la compatibilité des imports existants
export { PageHeaderSkeleton } from "./page-header-skeleton";
