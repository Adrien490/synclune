/**
 * Lightweight circuit breaker for external service calls (Stripe, Resend, etc.)
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is down, requests fail fast without calling the service
 * - HALF_OPEN: Testing if service recovered, allows one probe request
 *
 * @module shared/lib/circuit-breaker
 */

import { logger } from "@/shared/lib/logger";

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
	/** Number of consecutive failures before opening (default: 5) */
	failureThreshold?: number;
	/** Time in ms before attempting recovery (default: 30_000) */
	resetTimeout?: number;
	/** Name for logging purposes */
	name: string;
}

interface CircuitBreakerState {
	state: CircuitState;
	failureCount: number;
	lastFailureTime: number;
	successCount: number;
}

export class CircuitBreakerError extends Error {
	constructor(serviceName: string) {
		super(`Circuit breaker OPEN for ${serviceName} — service temporarily unavailable`);
		this.name = "CircuitBreakerError";
	}
}

export class CircuitBreaker {
	private readonly failureThreshold: number;
	private readonly resetTimeout: number;
	private readonly name: string;
	private circuit: CircuitBreakerState;

	constructor(options: CircuitBreakerOptions) {
		this.failureThreshold = options.failureThreshold ?? 5;
		this.resetTimeout = options.resetTimeout ?? 30_000;
		this.name = options.name;
		this.circuit = {
			state: "CLOSED",
			failureCount: 0,
			lastFailureTime: 0,
			successCount: 0,
		};
	}

	/**
	 * Execute a function through the circuit breaker.
	 * Fails fast when the circuit is OPEN, and tracks failures to trip the circuit.
	 */
	async execute<T>(fn: () => Promise<T>): Promise<T> {
		if (this.circuit.state === "OPEN") {
			// Check if enough time has passed to try recovery
			if (Date.now() - this.circuit.lastFailureTime >= this.resetTimeout) {
				this.circuit.state = "HALF_OPEN";
				this.circuit.successCount = 0;
				logger.info("Circuit breaker state transition", {
					service: this.name,
					from: "OPEN",
					to: "HALF_OPEN",
				});
			} else {
				throw new CircuitBreakerError(this.name);
			}
		}

		try {
			const result = await fn();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	private onSuccess(): void {
		if (this.circuit.state === "HALF_OPEN") {
			// One success in half-open means service recovered
			this.circuit.state = "CLOSED";
			this.circuit.failureCount = 0;
			this.circuit.successCount = 0;
			logger.info("Circuit breaker state transition", {
				service: this.name,
				from: "HALF_OPEN",
				to: "CLOSED",
			});
		} else if (this.circuit.state === "CLOSED") {
			// Reset failure count on success
			this.circuit.failureCount = 0;
		}
	}

	private onFailure(): void {
		this.circuit.failureCount++;
		this.circuit.lastFailureTime = Date.now();

		if (this.circuit.state === "HALF_OPEN") {
			// Failed during probe — re-open
			this.circuit.state = "OPEN";
			logger.warn("Circuit breaker state transition", {
				service: this.name,
				from: "HALF_OPEN",
				to: "OPEN",
			});
		} else if (this.circuit.failureCount >= this.failureThreshold) {
			this.circuit.state = "OPEN";
			logger.warn("Circuit breaker state transition", {
				service: this.name,
				from: "CLOSED",
				to: "OPEN",
				failureCount: this.circuit.failureCount,
			});
		}
	}

	/** Current circuit state (for health checks) */
	get state(): CircuitState {
		// If open and enough time passed, report as half-open
		if (
			this.circuit.state === "OPEN" &&
			Date.now() - this.circuit.lastFailureTime >= this.resetTimeout
		) {
			return "HALF_OPEN";
		}
		return this.circuit.state;
	}

	/** Whether the circuit is currently allowing requests */
	get isAvailable(): boolean {
		return this.state !== "OPEN";
	}

	/** Reset circuit to closed state (for testing) */
	reset(): void {
		this.circuit = {
			state: "CLOSED",
			failureCount: 0,
			lastFailureTime: 0,
			successCount: 0,
		};
	}
}

// ============================================================================
// Pre-configured instances for external services
// ============================================================================

export const stripeCircuitBreaker = new CircuitBreaker({
	name: "Stripe",
	failureThreshold: 5,
	resetTimeout: 30_000, // 30s
});

export const resendCircuitBreaker = new CircuitBreaker({
	name: "Resend",
	failureThreshold: 5,
	resetTimeout: 60_000, // 1min (emails can be retried later)
});
