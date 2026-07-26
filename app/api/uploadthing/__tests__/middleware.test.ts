/**
 * Middlewares du FileRouter UploadThing — garde d'accès, rate limit, MIME, taille.
 *
 * Audit média M14 : ces deux corps `.middleware()` portent la totalité du
 * contrôle d'accès aux uploads (re-vérification DB du rôle admin pour
 * `catalogMedia`, session pour `reviewMedia`) et la double validation
 * MIME/taille côté serveur. Ils n'étaient couverts par aucun test — la suite
 * `route.test.ts` ne vérifiait que le câblage de `createRouteHandler`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UploadThingError } from "uploadthing/server";

const { mockRequireAdminApiRoute, mockGetSession, mockCheckRateLimit } = vi.hoisted(() => {
	process.env.UPLOADTHING_TOKEN ??= "test-token";
	return {
		mockRequireAdminApiRoute: vi.fn(),
		mockGetSession: vi.fn(),
		mockCheckRateLimit: vi.fn(),
	};
});

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminApiRoute: mockRequireAdminApiRoute,
}));
vi.mock("@/modules/auth/lib/get-current-session", () => ({ getSession: mockGetSession }));
vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getClientIp: vi.fn(async () => "203.0.113.1"),
	getRateLimitIdentifier: vi.fn((userId: string) => `user:${userId}`),
}));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("@/shared/lib/uploadthing", () => ({
	utapi: { deleteFiles: vi.fn(), uploadFiles: vi.fn() },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));

import { ourFileRouter } from "../core";

type MiddlewareFile = { name: string; type: string; size: number };

/** Accès typé au middleware interne du FileRouter UploadThing (v7). */
function middleware(route: "catalogMedia" | "reviewMedia") {
	const def = ourFileRouter[route] as unknown as {
		middleware: (args: { files: MiddlewareFile[]; req: Request }) => Promise<unknown>;
	};
	return (files: MiddlewareFile[]) =>
		def.middleware({ files, req: new Request("https://synclune.fr/api/uploadthing") });
}

const IMAGE: MiddlewareFile = { name: "bague.jpg", type: "image/jpeg", size: 1024 };

beforeEach(() => {
	vi.clearAllMocks();
	mockRequireAdminApiRoute.mockResolvedValue({ user: { id: "admin-1", name: "Adri" } });
	mockGetSession.mockResolvedValue({ user: { id: "user-1", name: "Client" } });
	mockCheckRateLimit.mockResolvedValue({ success: true });
});

describe("catalogMedia.middleware", () => {
	it("rejette un non-admin", async () => {
		mockRequireAdminApiRoute.mockResolvedValue({ response: new Response(null, { status: 403 }) });

		await expect(middleware("catalogMedia")([IMAGE])).rejects.toBeInstanceOf(UploadThingError);
	});

	it("laisse passer un admin et expose son id en metadata", async () => {
		await expect(middleware("catalogMedia")([IMAGE])).resolves.toEqual({
			userId: "admin-1",
			userName: "Adri",
		});
	});

	it("rejette quand le rate limit est dépassé", async () => {
		mockCheckRateLimit.mockResolvedValue({ success: false, error: "Trop de tentatives" });

		await expect(middleware("catalogMedia")([IMAGE])).rejects.toThrow(/Trop de tentatives/);
	});

	it("vérifie l'accès AVANT toute validation de fichier", async () => {
		mockRequireAdminApiRoute.mockResolvedValue({ response: new Response(null, { status: 403 }) });

		await expect(
			middleware("catalogMedia")([{ name: "x.exe", type: "application/x-msdownload", size: 1 }]),
		).rejects.toThrow(/administrateurs/);
		expect(mockCheckRateLimit).not.toHaveBeenCalled();
	});

	// SVG volontairement exclu d'ALLOWED_IMAGE_TYPES : peut embarquer du script.
	it("rejette un SVG", async () => {
		await expect(
			middleware("catalogMedia")([{ name: "logo.svg", type: "image/svg+xml", size: 512 }]),
		).rejects.toThrow(/Type de fichier non autorisé/);
	});

	it("rejette un type ni image ni vidéo", async () => {
		await expect(
			middleware("catalogMedia")([{ name: "doc.pdf", type: "application/pdf", size: 512 }]),
		).rejects.toThrow(/Type de fichier non supporté/);
	});

	it("rejette une vidéo qui n'est pas du MP4", async () => {
		await expect(
			middleware("catalogMedia")([{ name: "clip.mov", type: "video/quicktime", size: 512 }]),
		).rejects.toThrow(/Type de fichier non autorisé/);
	});

	it("rejette une image au-delà de 16 Mo", async () => {
		await expect(
			middleware("catalogMedia")([{ ...IMAGE, size: 17 * 1024 * 1024 }]),
		).rejects.toThrow(/trop volumineux/);
	});

	it("accepte une vidéo MP4 sous 512 Mo", async () => {
		await expect(
			middleware("catalogMedia")([
				{ name: "clip.mp4", type: "video/mp4", size: 500 * 1024 * 1024 },
			]),
		).resolves.toBeTruthy();
	});

	it("rejette le lot entier dès qu'un seul fichier est invalide", async () => {
		await expect(
			middleware("catalogMedia")([IMAGE, { name: "x.svg", type: "image/svg+xml", size: 10 }]),
		).rejects.toBeInstanceOf(UploadThingError);
	});
});

describe("reviewMedia.middleware", () => {
	it("rejette un visiteur non authentifié", async () => {
		mockGetSession.mockResolvedValue(null);

		await expect(middleware("reviewMedia")([IMAGE])).rejects.toThrow(/connecté/);
	});

	it("laisse passer un utilisateur authentifié", async () => {
		await expect(middleware("reviewMedia")([IMAGE])).resolves.toEqual({
			userId: "user-1",
			userName: "Client",
		});
	});

	it("rejette quand le rate limit est dépassé", async () => {
		mockCheckRateLimit.mockResolvedValue({ success: false, error: "Trop de tentatives" });

		await expect(middleware("reviewMedia")([IMAGE])).rejects.toThrow(/Trop de tentatives/);
	});

	// Plafond propre à la route (4 Mo), plus strict que le catalogue (16 Mo).
	it("rejette une photo au-delà de 4 Mo", async () => {
		await expect(middleware("reviewMedia")([{ ...IMAGE, size: 5 * 1024 * 1024 }])).rejects.toThrow(
			/trop volumineux/,
		);
	});

	it("accepte une photo sous 4 Mo", async () => {
		await expect(
			middleware("reviewMedia")([{ ...IMAGE, size: 3 * 1024 * 1024 }]),
		).resolves.toBeTruthy();
	});

	it("rejette une vidéo (route images uniquement)", async () => {
		await expect(
			middleware("reviewMedia")([{ name: "clip.mp4", type: "video/mp4", size: 1024 }]),
		).rejects.toThrow(/Type de fichier non autorisé/);
	});
});
