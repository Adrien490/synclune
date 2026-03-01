import { TEST_RUN_ID, TEST_EMAIL_DOMAIN } from "../helpers/test-run";

/**
 * Factory functions for creating test data.
 * These generate unique, identifiable data for E2E tests.
 *
 * All generated data uses patterns that can be cleaned up by global-teardown.ts.
 */

let _counter = 0;

function nextId(): string {
	_counter++;
	return `${TEST_RUN_ID}-${_counter}`;
}

export interface TestUser {
	email: string;
	password: string;
	name: string;
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
	const id = nextId();
	return {
		email: `${id}@${TEST_EMAIL_DOMAIN}`,
		password: "TestPassword123!",
		name: `TestUser-${id}`,
		...overrides,
	};
}

export interface TestAddress {
	firstName: string;
	lastName: string;
	address1: string;
	postalCode: string;
	city: string;
	phone: string;
}

export function createTestAddress(overrides: Partial<TestAddress> = {}): TestAddress {
	return {
		firstName: "TestAddr",
		lastName: "E2E",
		address1: `${Math.floor(Math.random() * 99) + 1} rue de la Paix`,
		postalCode: "75002",
		city: "Paris",
		phone: `06${String(Math.floor(Math.random() * 100000000)).padStart(8, "0")}`,
		...overrides,
	};
}

export interface TestNewsletterSubscription {
	email: string;
}

export function createTestNewsletterEmail(): string {
	return `${nextId()}@${TEST_EMAIL_DOMAIN}`;
}

export interface TestCustomizationRequest {
	name: string;
	email: string;
	description: string;
}

export function createTestCustomizationRequest(
	overrides: Partial<TestCustomizationRequest> = {},
): TestCustomizationRequest {
	const id = nextId();
	return {
		name: `TestUser-${id}`,
		email: `${id}@${TEST_EMAIL_DOMAIN}`,
		description: "Test customization request for E2E testing.",
		...overrides,
	};
}

/** Stripe test card numbers */
export const STRIPE_CARDS = {
	/** Always succeeds */
	SUCCESS: "4242424242424242",
	/** Always declined */
	DECLINED: "4000000000000002",
	/** Requires 3D Secure authentication */
	THREE_D_SECURE: "4000000000003220",
	/** Insufficient funds */
	INSUFFICIENT_FUNDS: "4000000000009995",
	/** Expired card */
	EXPIRED: "4000000000000069",
} as const;
