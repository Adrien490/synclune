"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { RotateCcw } from "lucide-react";

interface GalleryErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
}

interface GalleryErrorBoundaryState {
	hasError: boolean;
}

/**
 * Error Boundary pour la galerie produit
 * Capture les erreurs des composants enfants et affiche un fallback gracieux
 * avec possibilité de retry
 */
export class GalleryErrorBoundary extends Component<
	GalleryErrorBoundaryProps,
	GalleryErrorBoundaryState
> {
	constructor(props: GalleryErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(): GalleryErrorBoundaryState {
		return { hasError: true };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// Log pour debugging
		console.error("[GalleryErrorBoundary] Erreur capturée:", error);
		console.error("[GalleryErrorBoundary] ComponentStack:", errorInfo.componentStack);

		// TODO: Intégrer un service de monitoring en production (Sentry, etc.)
		// Exemple avec Sentry:
		// if (process.env.NODE_ENV === "production") {
		//   Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
		// }
	}

	handleRetry = () => {
		this.setState({ hasError: false });
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div
					className="w-full aspect-square rounded-3xl bg-muted flex items-center justify-center"
					role="alert"
					aria-live="assertive"
				>
					<div className="text-center space-y-4 p-8">
						<p className="text-sm font-medium text-muted-foreground">
							Impossible de charger la galerie
						</p>
						<Button
							variant="secondary"
							size="sm"
							onClick={this.handleRetry}
							className="gap-2"
						>
							<RotateCcw className="w-4 h-4" />
							Réessayer
						</Button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
