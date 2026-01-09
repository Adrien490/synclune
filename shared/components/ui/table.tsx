"use client";

import * as React from "react";

import { cn } from "@/shared/utils/cn";

interface TableProps extends React.ComponentProps<"table"> {
	/** Activer le header sticky (nécessite sticky sur TableHeader aussi) */
	stickyHeader?: boolean;
	/** Alterner les couleurs des lignes (zebra striping) */
	striped?: boolean;
	/** Caption accessible décrivant le contenu du tableau (WCAG 1.3.1) */
	caption?: string;
}

function Table({
	className,
	stickyHeader,
	striped,
	caption,
	children,
	...props
}: TableProps) {
	return (
		<div
			data-slot="table-container"
			role="region"
			aria-label={caption || "Tableau de données"}
			tabIndex={0}
			className={cn(
				"relative w-full overflow-x-auto scroll-smooth",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				stickyHeader && "max-h-[70vh] overflow-y-auto"
			)}
		>
			<table
				data-slot="table"
				data-striped={striped || undefined}
				className={cn(
					"w-full caption-bottom text-sm",
					striped && "[&_tbody_tr:nth-child(even)]:bg-muted/30",
					className
				)}
				{...props}
			>
				{caption && <TableCaption>{caption}</TableCaption>}
				{children}
			</table>
		</div>
	);
}

interface TableHeaderProps extends React.ComponentProps<"thead"> {
	/** Rendre le header sticky (utiliser avec stickyHeader sur Table) */
	sticky?: boolean;
}

function TableHeader({
	className,
	sticky,
	...props
}: TableHeaderProps) {
	return (
		<thead
			data-slot="table-header"
			className={cn(
				"[&_tr]:border-b",
				sticky && "sticky top-0 z-10 bg-background shadow-sm",
				className
			)}
			{...props}
		/>
	);
}

interface TableBodyProps extends React.ComponentProps<"tbody"> {
	/** État de chargement (réduit opacité et désactive interactions) */
	isLoading?: boolean;
}

function TableBody({
	className,
	isLoading,
	...props
}: TableBodyProps) {
	return (
		<tbody
			data-slot="table-body"
			aria-busy={isLoading || undefined}
			aria-live={isLoading ? "polite" : undefined}
			className={cn(
				"[&_tr:last-child]:border-0",
				isLoading && "opacity-50 pointer-events-none",
				className
			)}
			{...props}
		/>
	);
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
	return (
		<tfoot
			data-slot="table-footer"
			className={cn(
				"bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
				className
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
				"hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
				className
			)}
			{...props}
		/>
	);
}

function TableHead({
	className,
	...props
}: React.ComponentProps<"th">) {
	return (
		<th
			data-slot="table-head"
			scope="col"
			className={cn(
				"text-foreground h-11 px-2 sm:px-3 text-left align-middle font-medium whitespace-nowrap",
				"[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
				className
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
				"p-2 sm:p-3 align-middle whitespace-nowrap",
				"[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
				className
			)}
			{...props}
		/>
	);
}

function TableCaption({
	className,
	...props
}: React.ComponentProps<"caption">) {
	return (
		<caption
			data-slot="table-caption"
			className={cn("text-muted-foreground mt-4 text-sm", className)}
			{...props}
		/>
	);
}

export {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
};

export type {
	TableProps,
	TableHeaderProps,
	TableBodyProps,
};
