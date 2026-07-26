import * as Sentry from "@sentry/nextjs";
import { BusinessError } from "@/shared/lib/actions/business-error";
import { COOKIE_CONSENT_CHANGE_EVENT, hasAnalyticsConsent } from "@/shared/lib/analytics/track";
import { scrubSentryEvent } from "@/shared/lib/sentry-scrub";

const SHARED_IGNORE_ERRORS = [
	"NEXT_REDIRECT",
	"NEXT_NOT_FOUND",
	"CircuitBreakerError",
	"DYNAMIC_SERVER_USAGE",
	"ResizeObserver loop",
	"ChunkLoadError",
];

const initSentry = () => {
	Sentry.init({
		dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
		release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
		environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,

		tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
		// Un replay est TOUJOURS capturé quand une erreur survient : c'est le cas
		// d'usage qui a de la valeur pour une opératrice solo (reproduire un bug
		// signalé par une cliente).
		replaysOnErrorSampleRate: 1.0,
		// 2 % de sessions sans erreur (audit coûts P3-1, ramené de 10 %). Le plan
		// Sentry Developer n'inclut que **50 replays/mois** : à 10 %, quelques
		// centaines de sessions consentantes épuisaient le quota en milieu de mois
		// — et une fois épuisé, Sentry droppe TOUT, y compris les replays d'erreur
		// qui sont les seuls réellement utiles. Échantillonner bas préserve donc
		// la capture qui compte.
		replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.02 : 0,

		sendDefaultPii: false,

		beforeSend(event, hint) {
			const error = hint.originalException;
			if (error instanceof BusinessError) return null;
			return scrubSentryEvent(event);
		},

		ignoreErrors: SHARED_IGNORE_ERRORS,
	});
};

// Session Replay = traceur soumis à consentement (ePrivacy/CNIL) : contrairement
// au monitoring d'erreurs (intérêt légitime, cf. /cookies), l'enregistrement de
// session ne se charge QUE si l'utilisateur a accepté les cookies optionnels.
let replayLoaded = false;
let replayStopped = false;

const initReplay = () => {
	if (replayLoaded) return;
	replayLoaded = true;
	Sentry.addIntegration(
		Sentry.replayIntegration({
			maskAllText: true,
			maskAllInputs: true,
			blockAllMedia: true,
		}),
	);
};

const syncReplayWithConsent = () => {
	if (hasAnalyticsConsent()) {
		if (!replayLoaded) {
			initReplay();
		} else if (replayStopped) {
			// Ré-acceptation en cours de session après un retrait.
			Sentry.getReplay()?.start();
			replayStopped = false;
		}
	} else if (replayLoaded && !replayStopped) {
		// Retrait du consentement en cours de session : arrêt de l'enregistrement.
		void Sentry.getReplay()?.stop();
		replayStopped = true;
	}
};

if ("requestIdleCallback" in window) {
	requestIdleCallback(() => void initSentry());
	setTimeout(() => requestIdleCallback(() => syncReplayWithConsent()), 5000);
} else {
	setTimeout(() => void initSentry(), 2000);
	setTimeout(() => syncReplayWithConsent(), 7000);
}

// Acceptation/refus après le chargement initial (bannière cliquée en cours de
// session) : le store cookie-consent émet cet événement à chaque choix.
window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, () => syncReplayWithConsent());

performance.mark("app-init");

window.addEventListener("error", (event) => {
	if (event.error instanceof Error) {
		Sentry.captureException(event.error);
	}
});

window.addEventListener("unhandledrejection", (event) => {
	const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
	Sentry.captureException(reason);
});

export function onRouterTransitionStart(
	url: string,
	navigationType: "push" | "replace" | "traverse",
) {
	performance.mark(`nav-${navigationType}-${url}`);
	Sentry.addBreadcrumb({
		category: "navigation",
		level: "info",
		message: `${navigationType} ${url}`,
	});
}
