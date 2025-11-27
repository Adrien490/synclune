import { HTMLAttributes } from "react";

export type MiniDotsLoaderSize = "xs" | "sm" | "md" | "lg" | "xl";
export type MiniDotsLoaderColor =
	| "default"
	| "primary"
	| "secondary"
	| "foreground"
	| "muted"
	| "accent"
	| "success"
	| "warning"
	| "destructive"
	| "white";

export interface MiniDotsLoaderProps extends HTMLAttributes<HTMLDivElement> {
	size?: MiniDotsLoaderSize;
	color?: MiniDotsLoaderColor;
	className?: string;
}
