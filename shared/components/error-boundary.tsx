"use client";

import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
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
	/** Max retry attempts before disabling retry button (default: 3) */
	maxRetries?: number;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	retryCount: number;
}

/**
 * Error Boundary generique reutilisable
 * Capture les erreurs des composants enfants et affiche un fallback gracieux
 * avec possibilite de retry
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null, retryCount: 0 };
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("[ErrorBoundary] Erreur capturee:", error);
		console.error("[ErrorBoundary] ComponentStack:", errorInfo.componentStack);
		Sentry.captureException(error, {
			contexts: { react: { componentStack: errorInfo.componentStack } },
		});
	}

	handleRetry = () => {
		this.setState((prev) => ({
			hasError: false,
			error: null,
			retryCount: prev.retryCount + 1,
		}));
		this.props.onRetry?.();
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			const maxRetries = this.props.maxRetries ?? 3;
			const canRetry = this.state.retryCount < maxRetries;

			return (
				<div
					className={
						this.props.className ??
						"bg-muted flex aspect-square w-full items-center justify-center rounded-3xl"
					}
					role="alert"
					aria-live="assertive"
				>
					<div className="space-y-4 p-8 text-center">
						<p className="text-muted-foreground text-sm font-medium">
							{canRetry
								? (this.props.errorMessage ?? "Impossible de charger le contenu")
								: "Le probleme persiste. Veuillez rafraichir la page."}
						</p>
						{canRetry ? (
							<Button variant="secondary" size="sm" onClick={this.handleRetry} className="gap-2">
								<RotateCcw className="h-4 w-4" />
								Reessayer
							</Button>
						) : (
							<Button
								variant="secondary"
								size="sm"
								onClick={() => window.location.reload()}
								className="gap-2"
							>
								<RotateCcw className="h-4 w-4" />
								Rafraichir la page
							</Button>
						)}
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
