"use client";

import { Component, type ReactNode } from "react";
import { ChartError } from "./chart-error";

interface DashboardErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
	/** Callback appele lors du retry */
	onRetry?: () => void;
}

interface DashboardErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

/**
 * Error Boundary pour les composants du dashboard
 * Capture les erreurs des composants enfants (charts, KPIs, listes)
 * et affiche un fallback gracieux avec possibilite de retry
 */
export class DashboardErrorBoundary extends Component<
	DashboardErrorBoundaryProps,
	DashboardErrorBoundaryState
> {
	constructor(props: DashboardErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): DashboardErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// Log pour debugging en developpement
		console.error("[DashboardErrorBoundary] Erreur capturee:", error);
		console.error("[DashboardErrorBoundary] ComponentStack:", errorInfo.componentStack);

		// TODO: Integrer un service de monitoring en production (Sentry, etc.)
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

			// Utilise le ChartError importe statiquement
			return <ChartError onRetry={this.handleRetry} />;
		}

		return this.props.children;
	}
}
