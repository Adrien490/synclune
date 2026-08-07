import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * @regression webhook-api-version-drift
 *
 * La version d'API de l'ENDPOINT webhook n'était vérifiée nulle part.
 *
 * `06-api-versioning.md` et la checklist de mise en production Stripe disent la
 * même chose : « les événements webhook sont structurés selon la version de l'API
 * de votre COMPTE, sauf si vous définissez une version d'API lors de la création
 * du endpoint ». Or `event-registry.ts` caste `event.data.object` vers les types
 * du SDK installé, sur les 5 familles d'objets.
 *
 * Les 11 fixtures assertent bien `api_version`, mais elles sont **écrites à la
 * main** : elles n'assertent rien sur la production. Une dérive se serait
 * manifestée par un champ `undefined` au fond d'un handler — commande non
 * traitée, remboursement non ingéré — **sans aucun signal**.
 *
 * Les trois assertions ci-dessous verrouillent les trois décisions de la garde,
 * et chacune a été prouvée en réintroduisant son défaut :
 *
 *  1. un désaccord alerte MAIS ne bloque pas (`dispatchEvent` est quand même
 *     appelé) — rejeter ferait retenter Stripe jusqu'à épuisement sur un event
 *     authentique que le retry ne rendra pas plus lisible ;
 *  2. un accord reste SILENCIEUX — sinon l'alerte se transforme en bruit de fond
 *     et personne ne la lit plus ;
 *  3. `api_version: null` ne déclenche RIEN — traiter l'absence comme un
 *     désaccord produirait un bruit permanent (le défaut déjà commis sur
 *     `livemode` avec un `!==` nu).
 *
 * ⚠️ Ce fichier ne mocke PAS `@/shared/constants/stripe-api-version` : il compare
 * contre la VRAIE SSOT. Re-mocker une version arbitraire rendrait le test
 * tautologique — il resterait vert alors que la route comparerait à autre chose.
 * Même raisonnement que TEST-RLMOCK-01 dans `route.test.ts`.
 */

const {
	mockConstructEvent,
	mockStripe,
	mockPrisma,
	mockNextResponseJson,
	mockAfter,
	mockHeaders,
	mockDispatchEvent,
	mockIsEventSupported,
	mockExecutePostWebhookTasks,
	mockSendWebhookFailedAlert,
	mockCheckRateLimit,
	mockGetClientIp,
	mockLoggerWarn,
	mockLogger,
	mockCaptureMessage,
	mockSetFingerprint,
	mockScope,
	mockWithScope,
	mockStartSpan,
	WebhookEventStatus,
} = vi.hoisted(() => {
	const loggerWarn = vi.fn();
	const constructEvent = vi.fn();
	const setFingerprint = vi.fn();
	const scope = {
		setLevel: vi.fn(),
		setTag: vi.fn(),
		setFingerprint,
		setContext: vi.fn(),
	};

	return {
		mockConstructEvent: constructEvent,
		mockStripe: { webhooks: { constructEvent } },
		mockPrisma: {
			webhookEvent: {
				findUnique: vi.fn(),
				create: vi.fn(),
				updateMany: vi.fn(),
				update: vi.fn(),
			},
			$transaction: vi.fn(),
		},
		mockNextResponseJson: vi.fn((body: unknown, init?: ResponseInit) => ({
			body,
			status: init?.status ?? 200,
		})),
		mockAfter: vi.fn((fn: () => Promise<void>) => fn()),
		mockHeaders: vi.fn(),
		mockDispatchEvent: vi.fn(),
		mockIsEventSupported: vi.fn(),
		mockExecutePostWebhookTasks: vi.fn(),
		mockSendWebhookFailedAlert: vi.fn(),
		mockCheckRateLimit: vi.fn(),
		mockGetClientIp: vi.fn(),
		mockLoggerWarn: loggerWarn,
		mockLogger: { info: vi.fn(), warn: loggerWarn, error: vi.fn(), debug: vi.fn() },
		mockCaptureMessage: vi.fn(),
		mockSetFingerprint: setFingerprint,
		mockScope: scope,
		mockWithScope: vi.fn((fn: (s: typeof scope) => void) => fn(scope)),
		mockStartSpan: vi.fn((_options: unknown, fn: () => unknown) => fn()),
		WebhookEventStatus: {
			PENDING: "PENDING",
			PROCESSING: "PROCESSING",
			COMPLETED: "COMPLETED",
			FAILED: "FAILED",
			SKIPPED: "SKIPPED",
		},
	};
});

vi.mock("@/shared/lib/stripe", () => ({ stripe: mockStripe }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("next/server", () => ({
	NextResponse: { json: mockNextResponseJson },
	after: mockAfter,
}));

vi.mock("next/headers", () => ({ headers: mockHeaders }));

vi.mock("@/modules/webhooks/utils/event-registry", () => ({
	dispatchEvent: mockDispatchEvent,
	isEventSupported: mockIsEventSupported,
}));

vi.mock("@/modules/webhooks/services/execute-post-webhook-tasks.service", () => ({
	executePostWebhookTasks: mockExecutePostWebhookTasks,
}));

vi.mock("@/modules/webhooks/services/alert.service", () => ({
	sendWebhookFailedAlert: mockSendWebhookFailedAlert,
}));

vi.mock("@/app/generated/prisma/client", () => ({ WebhookEventStatus }));

vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getClientIp: mockGetClientIp,
}));

vi.mock("@sentry/nextjs", () => ({
	withScope: mockWithScope,
	captureMessage: mockCaptureMessage,
	captureException: vi.fn(),
	startSpan: mockStartSpan,
}));

// SSOT réelle, délibérément NON mockée (cf. docstring).
import { STRIPE_API_VERSION } from "@/shared/constants/stripe-api-version";
import { POST } from "../route";

const DRIFT_LOG = "Webhook API version drift";

/**
 * Version « autre », DÉRIVÉE de la SSOT au lieu d'être codée en dur.
 *
 * Deux raisons, et la seconde est un garde-fou qui s'est déclenché sur ce fichier :
 *  1. elle reste divergente après n'importe quel bump — un littéral figé finirait par
 *     coïncider avec la vraie version et le test passerait pour la mauvaise raison ;
 *  2. `stripe-api-version-ssot.regression.test.ts` scanne `app/`, `modules/` et
 *     `shared/` à la recherche de tout littéral de la forme date + codename hors SSOT,
 *     **prose des commentaires incluse** (une des quatre copies historiques en était
 *     une). Une ancienne version écrite en dur ici le faisait échouer — à raison, et
 *     l'écrire dans ce commentaire pour l'expliquer le refaisait échouer aussi.
 * Le `replace` ci-dessous ne produit aucun littéral de cette forme dans le source.
 */
const DRIFTED_API_VERSION = STRIPE_API_VERSION.replace(/^\d{4}/, "1999");

function makeStripeEvent(overrides: Record<string, unknown> = {}) {
	return {
		id: "evt_version_drift",
		type: "payment_intent.succeeded",
		livemode: false,
		api_version: STRIPE_API_VERSION,
		created: Math.floor(Date.now() / 1000) - 10,
		data: { object: {} },
		...overrides,
	};
}

function makeRequest() {
	return {
		text: vi.fn().mockResolvedValue('{"type":"payment_intent.succeeded"}'),
	} as unknown as Request;
}

function driftWarnCalls() {
	return mockLoggerWarn.mock.calls.filter(([message]) => message === DRIFT_LOG);
}

function driftSentryCalls() {
	return mockCaptureMessage.mock.calls.filter(([message]) => message === DRIFT_LOG);
}

beforeEach(() => {
	vi.clearAllMocks();

	process.env.STRIPE_SECRET_KEY = "sk_test_123";
	process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";

	mockHeaders.mockResolvedValue({
		get: vi.fn((key: string) => (key === "stripe-signature" ? "t=123,v1=valid_sig" : null)),
	});
	mockGetClientIp.mockResolvedValue("203.0.113.10");
	mockCheckRateLimit.mockResolvedValue({ success: true });

	mockConstructEvent.mockReturnValue(makeStripeEvent());

	mockPrisma.webhookEvent.findUnique.mockResolvedValue(null);
	mockPrisma.webhookEvent.create.mockResolvedValue({ id: "wh_1", attempts: 0 });
	mockPrisma.webhookEvent.updateMany.mockResolvedValue({ count: 1 });
	mockPrisma.webhookEvent.update.mockResolvedValue({});

	mockIsEventSupported.mockReturnValue(true);
	mockDispatchEvent.mockResolvedValue({ success: true, tasks: [] });
});

describe("webhook — dérive de version d'API de l'endpoint", () => {
	it("alerte quand l'event ne porte PAS la version du SDK — sans jamais bloquer le traitement", async () => {
		mockConstructEvent.mockReturnValue(makeStripeEvent({ api_version: DRIFTED_API_VERSION }));

		const response = await POST(makeRequest());

		// 1. Le signal existe, côté logs ET côté Sentry.
		expect(driftWarnCalls()).toHaveLength(1);
		expect(driftWarnCalls()[0]?.[1]).toMatchObject({
			eventApiVersion: DRIFTED_API_VERSION,
			expectedApiVersion: STRIPE_API_VERSION,
		});
		expect(driftSentryCalls()).toHaveLength(1);

		// 2. ⚠️ Le cœur de la garde : on NE REJETTE PAS. Un 4xx/5xx ferait retenter
		// Stripe jusqu'à épuisement sur un event authentique — l'event est traité,
		// et c'est l'humain qui va ré-épingler la version sur l'endpoint.
		expect(mockDispatchEvent).toHaveBeenCalledTimes(1);
		expect(response.status).toBe(200);
		expect(response.body).toMatchObject({ received: true, status: "processed" });
	});

	it("distingue deux dérives successives par le fingerprint (sinon la 2e est avalée par le groupe résolu de la 1re)", async () => {
		mockConstructEvent.mockReturnValue(makeStripeEvent({ api_version: DRIFTED_API_VERSION }));
		await POST(makeRequest());

		expect(mockSetFingerprint).toHaveBeenCalledWith([
			"webhook",
			"api-version-drift",
			DRIFTED_API_VERSION,
		]);
	});

	it("reste SILENCIEUX quand la version de l'event est celle du SDK", async () => {
		mockConstructEvent.mockReturnValue(makeStripeEvent({ api_version: STRIPE_API_VERSION }));

		await POST(makeRequest());

		expect(driftWarnCalls()).toHaveLength(0);
		expect(driftSentryCalls()).toHaveLength(0);
		expect(mockDispatchEvent).toHaveBeenCalledTimes(1);
	});

	it("n'arbitre PAS sur un `api_version` absent — l'absence n'est pas un désaccord", async () => {
		// Même défaut que le `!== expectsLiveEvents` nu de la garde `livemode` : traiter
		// un champ manquant comme une divergence produit un bruit permanent, sur tous
		// les events, pour une inférence que rien ne soutient.
		mockConstructEvent.mockReturnValue(makeStripeEvent({ api_version: null }));

		await POST(makeRequest());

		expect(driftWarnCalls()).toHaveLength(0);
		expect(driftSentryCalls()).toHaveLength(0);
		expect(mockDispatchEvent).toHaveBeenCalledTimes(1);
	});
});
