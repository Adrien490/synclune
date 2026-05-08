import { type HTMLAttributes } from "react";

type MiniDotsLoaderSize = "xs" | "sm" | "md" | "lg" | "xl";
type MiniDotsLoaderColor =
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
