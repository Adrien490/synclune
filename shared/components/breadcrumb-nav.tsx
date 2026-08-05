import Link from "next/link";

import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";

export type BreadcrumbNavProps = {
	/** Maillons APRÈS « Accueil », ajouté d'office. Le dernier porte `aria-current="page"`, sans lien. */
	items: Array<{ label: string; href: string }>;
	/** Défaut : masqué sous `md` — le bloc titre juste en dessous dit où l'on est. */
	className?: string;
};

/**
 * Fil d'Ariane VISUEL du storefront — extrait du shell catalogue
 * (« L'étal continue », 2026-08-05).
 *
 * @description
 * ⚠️ **AUCUN `BreadcrumbList` JSON-LD, jamais** : le balisage d'une page est
 * émis par SON générateur JSON-LD page-level (imbriqué dans un `@graph` ou en
 * script dédié). C'est le double émetteur (`PageHeader` + générateur de page)
 * qui publiait deux `BreadcrumbList` par URL — verrouillé par
 * `catalogue-single-breadcrumb.regression.test.ts`.
 *
 * Masqué sous `md` par défaut : la barre d'outils ou le bloc titre y occupe
 * déjà la ligne, et le titre juste en dessous dit où l'on est.
 */
export function BreadcrumbNav({
	items,
	className = "text-muted-foreground hidden text-sm leading-normal md:block",
}: BreadcrumbNavProps) {
	return (
		<nav aria-label="Fil d'Ariane" className={className}>
			<ol className="m-0 flex list-none items-center gap-2 p-0">
				<li>
					<Link href="/" className="focus-ring rounded-sm hover:underline">
						Accueil
					</Link>
				</li>
				{items.map((crumb, index) => {
					const isLast = index === items.length - 1;
					return (
						<li key={crumb.href} className="flex items-center gap-2">
							<span aria-hidden="true">/</span>
							{isLast ? (
								<span className="text-foreground font-medium" aria-current="page">
									{crumb.label}
								</span>
							) : (
								<Link href={crumb.href} className="focus-ring rounded-sm hover:underline">
									{crumb.label}
								</Link>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

/** Miroir pour les `loading.tsx` — même gabarit `hidden md:block`. */
export function BreadcrumbNavSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("hidden md:block", className)}>
			<Skeleton className="h-5 w-44 rounded" />
		</div>
	);
}
