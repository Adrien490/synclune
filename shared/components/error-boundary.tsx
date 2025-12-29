"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { RotateCcw } from "lucide-react";

interface ErrorBoundaryProps {
	children: ReactNode;
	/** Fallback custom a afficher en cas d'erreur */
	fallback?: ReactNode;
	/** Callback appele lors du retry */
	onRetry?: () => void;
	/** Message d'erreur personnalise */
	errorMessage?: string;
	/** Classes CSS pour le conteneur du fallback par defaut */
	className?: string;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

/**
 * Error Boundary generique reutilisable
 * Capture les erreurs des composants enfants et affiche un fallback gracieux
 * avec possibilite de retry
 */
export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("[ErrorBoundary] Erreur capturee:", error);
		console.error("[ErrorBoundary] ComponentStack:", errorInfo.componentStack);
	}

	handleRetry = () => {
		this.setState({ hasError: false, error: null });
		this.props.onRetry?.();
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div
					className={
						this.props.className ??
						"w-full aspect-square rounded-3xl bg-muted flex items-center justify-center"
					}
					role="alert"
					aria-live="assertive"
				>
					<div className="text-center space-y-4 p-8">
						<p className="text-sm font-medium text-muted-foreground">
							{this.props.errorMessage ?? "Impossible de charger le contenu"}
						</p>
						<Button
							variant="secondary"
							size="sm"
							onClick={this.handleRetry}
							className="gap-2"
						>
							<RotateCcw className="w-4 h-4" />
							Reessayer
						</Button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
