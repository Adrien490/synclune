"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
import { ArrowDown, ArrowUp } from "lucide-react";

export interface KpiCardProps {
	title: string;
	value: string | number;
	evolution?: number;
	badge?: {
		label: string;
		variant?: "default" | "secondary" | "destructive" | "outline";
	};
	subtitle?: string;
	icon?: React.ReactNode;
	/** Variante de couleur pour les alertes */
	variant?: "default" | "danger" | "warning" | "info";
}

const variantStyles = {
	default: "border-primary/40 from-primary/5",
	danger: "border-red-500/50 from-red-500/5",
	warning: "border-orange-500/50 from-orange-500/5",
	info: "border-blue-500/50 from-blue-500/5",
};

export function KpiCard({
	title,
	value,
	evolution,
	badge,
	subtitle,
	icon,
	variant = "default",
}: KpiCardProps) {
	return (
		<Card className={cn(
			"relative overflow-hidden border-l-4 bg-gradient-to-br via-background to-transparent hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group",
			variantStyles[variant]
		)}>
			{/* Particule décorative subtile */}
			<div
				className="absolute top-2 right-2 w-1 h-1 bg-secondary rounded-full opacity-40 group-hover:opacity-60 transition-opacity"
				aria-hidden="true"
			/>

			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">
					{title}
				</CardTitle>
				{icon && (
					<div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 border border-primary/20 text-primary group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
						{icon}
					</div>
				)}
			</CardHeader>
			<CardContent>
				<div className="text-3xl font-semibold tracking-tight text-foreground">{value}</div>
				<div className="flex items-center gap-2 mt-2">
					{evolution !== undefined && (
						<div
							className={cn(
								"flex items-center text-xs font-medium",
								evolution >= 0 ? "text-emerald-600" : "text-rose-600"
							)}
						>
							{evolution >= 0 ? (
								<ArrowUp className="w-3 h-3 mr-0.5" />
							) : (
								<ArrowDown className="w-3 h-3 mr-0.5" />
							)}
							<span className="font-semibold">{Math.abs(evolution).toFixed(1)}%</span>
						</div>
					)}
					{badge && (
						<Badge
							variant={badge.variant || "default"}
							className="text-xs font-normal"
						>
							{badge.label}
						</Badge>
					)}
					{subtitle && (
						<p className="text-xs text-muted-foreground font-medium">{subtitle}</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
