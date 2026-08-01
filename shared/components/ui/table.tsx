"use client";

import * as React from "react";

import { cn } from "@/shared/utils/cn";

interface TableProps extends React.ComponentProps<"table"> {
	/** Alterner les couleurs des lignes (zebra striping) */
	striped?: boolean;
	/** Caption accessible décrivant le contenu du tableau (WCAG 1.3.1) */
	caption?: string;
	/** Skip the outer role="region" wrapper (use when already inside a TableScrollContainer) */
	noRegion?: boolean;
}

function Table({ className, striped, caption, noRegion, children, ...props }: TableProps) {
	const tableElement = (
		<table
			data-slot="table"
			data-striped={striped ?? undefined}
			className={cn(
				"w-full caption-bottom text-sm",
				striped && "[&_tbody_tr:nth-child(even)]:bg-muted/30",
				className,
			)}
			{...props}
		>
			{caption && <TableCaption>{caption}</TableCaption>}
			{children}
		</table>
	);

	if (noRegion) return tableElement;

	return (
		<div
			data-slot="table-container"
			role="region"
			aria-label={caption ?? "Tableau de données"}
			// eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable container needs keyboard access
			tabIndex={0}
			className={cn("relative w-full overflow-x-auto scroll-smooth", "focus-ring")}
		>
			{tableElement}
		</div>
	);
}

// Pas de prop `sticky` ici : les en-têtes collants des tables admin sont posés
// par `AdminDataTable` via un variant descendant, ce qui évite une prop que
// chaque table devrait penser à passer (l'ancienne API n'avait aucun appelant).
function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
	return <thead data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />;
}

interface TableBodyProps extends React.ComponentProps<"tbody"> {
	/** État de chargement (réduit opacité et désactive interactions) */
	isLoading?: boolean;
}

function TableBody({ className, isLoading, ...props }: TableBodyProps) {
	return (
		<tbody
			data-slot="table-body"
			aria-busy={isLoading ?? undefined}
			/*
			 * Pas d'`aria-live` ici.
			 *
			 * Il y en avait un, gaté sur `isLoading` — donc la propriété était
			 * *ajoutée* au début du chargement puis *retirée* avant l'arrivée des
			 * lignes : elle ne se déclenchait jamais. Et même correctement câblée,
			 * rendre un `<tbody>` entier live ferait relire toutes les cellules à
			 * chaque mise à jour. L'état de chargement est porté par `aria-busy`, et
			 * le compteur de résultats est annoncé par `CursorPagination`
			 * (`cursor-pagination.tsx`), région montée en permanence.
			 */
			className={cn(
				"[&_tr:last-child]:border-0",
				isLoading && "pointer-events-none opacity-50",
				className,
			)}
			{...props}
		/>
	);
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
	return (
		<tr
			data-slot="table-row"
			className={cn(
				"hover:bg-primary/8 data-[state=selected]:bg-muted border-b transition-colors",
				className,
			)}
			{...props}
		/>
	);
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
	return (
		<th
			data-slot="table-head"
			scope="col"
			className={cn(
				"text-foreground h-11 px-2 text-left align-middle font-medium whitespace-nowrap sm:px-3",
				"[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5",
				className,
			)}
			{...props}
		/>
	);
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
	return (
		<td
			data-slot="table-cell"
			className={cn(
				"p-2 align-middle whitespace-nowrap sm:p-3",
				"[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5",
				className,
			)}
			{...props}
		/>
	);
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
	return (
		<caption
			data-slot="table-caption"
			className={cn("text-muted-foreground mt-4 text-sm", className)}
			{...props}
		/>
	);
}

export { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow };
