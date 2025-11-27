"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "next-themes";

const icons = {
	success: (
		<svg className="size-5 text-primary" viewBox="0 0 20 20" fill="none" strokeWidth="1.5" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" d="M5 10.5l3.5 3.5L15 6" />
		</svg>
	),
	error: (
		<svg className="size-5 text-destructive" viewBox="0 0 20 20" fill="none" strokeWidth="1.5" stroke="currentColor">
			<path strokeLinecap="round" d="M6 6l8 8M14 6l-8 8" />
		</svg>
	),
	warning: (
		<svg className="size-5 text-secondary" viewBox="0 0 20 20" fill="none" strokeWidth="1.5" stroke="currentColor">
			<path strokeLinecap="round" d="M10 6v5M10 13.5v.5" />
		</svg>
	),
	info: (
		<svg className="size-5 text-muted-foreground" viewBox="0 0 20 20" fill="none" strokeWidth="1.5" stroke="currentColor">
			<path strokeLinecap="round" d="M10 9v4M10 6.5v.5" />
		</svg>
	),
	loading: (
		<svg className="size-5 text-primary animate-spin" viewBox="0 0 20 20" fill="none" strokeWidth="1.5" stroke="currentColor">
			<path strokeLinecap="round" d="M10 2a8 8 0 0 1 8 8" />
		</svg>
	),
};

export function AppToaster() {
	const { resolvedTheme } = useTheme();

	return (
		<SonnerToaster
			theme={resolvedTheme as "light" | "dark" | "system"}
			position="top-center"
			duration={2500}
			visibleToasts={3}
			icons={icons}
			toastOptions={{
				classNames: {
					toast: "!bg-card !border-border/60 !rounded-lg !shadow-sm !py-3 !px-4",
					title: "!font-medium !text-sm !text-foreground",
					description: "!text-sm !text-muted-foreground",
					success: "!border-l-2 !border-l-primary",
					error: "!border-l-2 !border-l-destructive",
					warning: "!border-l-2 !border-l-secondary",
					info: "!border-l-2 !border-l-muted-foreground/50",
				},
			}}
		/>
	);
}
