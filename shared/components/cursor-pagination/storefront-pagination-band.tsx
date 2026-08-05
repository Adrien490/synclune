"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import { Suspense, type ReactNode } from "react";

import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { cn } from "@/shared/utils/cn";

import { useCursorPaginationNav } from "./use-cursor-pagination-nav";

interface StorefrontPaginationBandProps {
	/**
	 * Titre display de la bande (ex. « La suite de l'étal »). ⚠️ Sans chiffre :
	 * il se compose en `font-display` (Winky Sans), qui n'a pas de chiffres
	 * tabulaires — tout nombre vit dans la sous-ligne, en sans.
	 */
	title: string;
	/** Nom des pièces pour la copie (« bijou »/« bijoux », « collection »/« collections »). */
	noun: { singular: string; plural: string };
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	currentPageSize: number;
	nextCursor: string | null;
	prevCursor: string | null;
	totalCount?: number;
}

/** Nombre mis en avant dans la sous-ligne — la graisse des montants (2 crans). */
function Count({ children }: { children: ReactNode }) {
	return <span className="text-foreground font-medium">{children}</span>;
}

/**
 * La fin de l'étal — pagination BOUTIQUE (audit cursor-pagination 2026-08-05,
 * direction C). Là où l'admin garde sa barre-outil (`CursorPagination`), la
 * boutique termine sa liste sur une invitation : une bande dans le lavis rose
 * de la marque, ce qu'il reste à découvrir, et un seul geste pour continuer.
 *
 * Même mécanique URL que la barre admin (`useCursorPaginationNav` :
 * cursor/direction préservant les autres params, scroll-to-top sur vrai
 * changement, prefetch) — seule la vue change. Pas de sélecteur « par page » :
 * choisir sa densité de lignes est un besoin de Léane, pas d'une visiteuse.
 *
 * Le `<nav aria-label="Pagination">` est un contrat : `e2e/a11y/`
 * `keyboard-navigation.spec.ts` cherche cette nav sur /produits et exige un
 * premier contrôle focusable.
 *
 * Comme la barre admin, la bande ne se rend PAS quand la liste tient sur une
 * page — et le squelette de route ne la dessine pas (il ne peut pas savoir
 * s'il y aura une page 2) : elle vit sous le pli d'une liste pleine, le swap
 * n'y produit pas de décalage visible.
 */
function StorefrontPaginationBandInner({
	title,
	noun,
	hasNextPage,
	hasPreviousPage,
	currentPageSize,
	nextCursor,
	prevCursor,
	totalCount,
}: StorefrontPaginationBandProps) {
	const { cursor, isPending, lastAction, goNext, goPrevious, reset } = useCursorPaginationNav({
		nextCursor,
		prevCursor,
	});

	if (!hasNextPage && !hasPreviousPage) return null;

	const isFirstPage = !cursor;
	const isLastPage = !hasNextPage;
	const hasTotal = typeof totalCount === "number";
	const remaining = hasTotal ? Math.max(totalCount - currentPageSize, 0) : null;

	// La position exacte n'est pas calculable en cursor-pagination opaque : le
	// « Encore N » (total − vus) n'est vrai qu'en première page. Plus loin, la
	// copie reste tournée vers l'avant mais sans compte de reste inventé.
	const subline = isLastPage ? (
		hasTotal ? (
			<>
				Tu viens de parcourir les <Count>{totalCount}</Count> {noun.plural} de la boutique.
			</>
		) : (
			<>Tu viens de tout parcourir.</>
		)
	) : isFirstPage && remaining !== null && remaining > 0 ? (
		<>
			Encore <Count>{remaining}</Count> {remaining > 1 ? noun.plural : noun.singular} à découvrir —
			tu en as vu <Count>{currentPageSize}</Count> sur <Count>{totalCount}</Count>.
		</>
	) : hasTotal ? (
		<>
			Il en reste à découvrir — <Count>{totalCount}</Count> {noun.plural} en tout.
		</>
	) : (
		<>Il en reste à découvrir.</>
	);

	const liveMessage = isPending
		? "Chargement de la suite…"
		: `Page chargée, ${currentPageSize} ${currentPageSize > 1 ? noun.plural : noun.singular}.`;

	return (
		<nav
			aria-label="Pagination"
			className={cn(
				"transition-opacity duration-200",
				isPending && "pointer-events-none opacity-80",
			)}
		>
			{/* Live region pour screen readers */}
			<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
				{liveMessage}
			</div>
			{/* `data-accent` posé ICI : la bande est rose par défaut où qu'elle
			    vive — hors de tout [data-accent], --section-band serait indéfinie
			    (background invalide, donc transparent). Une section qui veut la
			    teinter autrement pose son accent SUR la bande, pas au-dessus.
			    Rayons : `rounded-2xl` (16 px) puis la var `--radius-lg` de globals
			    (20 px) en référence DIRECTE — les `--radius-*` de globals ne sont
			    PAS des clés de thème Tailwind, `sm:rounded-lg` rendrait 8 px. */}
			<div
				data-accent="rose"
				className="relative rounded-2xl bg-(--section-band) px-5 py-8 text-center sm:rounded-(--radius-lg) sm:px-8 sm:py-10"
			>
				{hasPreviousPage && (
					<button
						type="button"
						onClick={goPrevious}
						disabled={isPending}
						className={cn(
							"text-muted-foreground can-hover:hover:text-foreground focus-ring mx-auto mb-2 flex h-11 cursor-pointer items-center gap-1 rounded-md px-2 text-sm transition-colors disabled:pointer-events-none",
							"lg:absolute lg:top-1/2 lg:left-6 lg:mb-0 lg:-translate-y-1/2",
						)}
					>
						{isPending && lastAction === "prev" ? (
							<Spinner presentational className="size-4" />
						) : (
							<CaretLeftIcon aria-hidden="true" className="size-4" />
						)}
						Page précédente
					</button>
				)}

				<p className="font-display text-xl font-normal tracking-tight md:text-2xl">
					{isLastPage ? "Tu as tout vu !" : title}
				</p>
				<p className="text-muted-foreground mx-auto mt-2 max-w-prose text-sm">{subline}</p>

				{hasNextPage && (
					<Button size="lg" disabled={isPending} onClick={goNext} className="mt-6 cursor-pointer">
						{isPending && lastAction === "next" ? (
							<>
								<Spinner presentational />
								Un instant…
							</>
						) : (
							<>
								Découvrir la suite
								<CaretRightIcon aria-hidden="true" className="size-4" />
							</>
						)}
					</Button>
				)}

				{!isFirstPage && (
					<button
						type="button"
						onClick={reset}
						disabled={isPending}
						className="text-muted-foreground can-hover:hover:text-foreground focus-ring mx-auto mt-4 flex h-11 cursor-pointer items-center rounded-md px-2 text-sm underline underline-offset-4 transition-colors disabled:pointer-events-none"
					>
						{isPending && lastAction === "reset" ? (
							<Spinner presentational className="mr-1.5 size-4" />
						) : null}
						Revenir au début
					</button>
				)}
			</div>
		</nav>
	);
}

export function StorefrontPaginationBand(props: StorefrontPaginationBandProps) {
	// Même contrat que `CursorPagination` : `useSearchParams` exige une frontière
	// Suspense pour ne pas faire dérailler le prerender des pages statiques.
	return (
		<Suspense fallback={null}>
			<StorefrontPaginationBandInner {...props} />
		</Suspense>
	);
}
