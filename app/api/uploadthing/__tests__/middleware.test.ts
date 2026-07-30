/**
 * Middlewares du FileRouter UploadThing — garde d'accès, rate limit, MIME, taille.
 *
 * Audit média M14 : ce corps `.middleware()` porte la totalité du contrôle
 * d'accès aux uploads (re-vérification DB du rôle admin pour `catalogMedia`) et
 * la double validation MIME/taille côté serveur. Il n'était couvert par aucun
 * test — la suite `route.test.ts` ne vérifiait que le câblage de
 * `createRouteHandler`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UploadThingError } from "uploadthing/server";
// Plafonds tirés de la SSOT et non écrits en dur : c'est ce qui empêche un cas de
// test de valider une limite différente de celle qu'applique le FileRouter.
import {
	MAX_UPLOAD_SIZE_IMAGE,
	MAX_UPLOAD_SIZE_VIDEO,
} from "@/modules/media/constants/upload-size-limits";

const { mockRequireAdminApiRoute, mockCheckRateLimit } = vi.hoisted(() => {
	process.env.UPLOADTHING_TOKEN ??= "test-token";
	return {
		mockRequireAdminApiRoute: vi.fn(),
		mockCheckRateLimit: vi.fn(),
	};
});

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminApiRoute: mockRequireAdminApiRoute,
}));
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
function middleware(route: "catalogMedia") {
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

	it("accepte une image pile au plafond", async () => {
		await expect(
			middleware("catalogMedia")([{ ...IMAGE, size: MAX_UPLOAD_SIZE_IMAGE }]),
		).resolves.toBeTruthy();
	});

	it("rejette une image d'un octet au-delà du plafond", async () => {
		await expect(
			middleware("catalogMedia")([{ ...IMAGE, size: MAX_UPLOAD_SIZE_IMAGE + 1 }]),
		).rejects.toThrow(/trop volumineux/);
	});

	// ⚠️ Paire frontière volontaire. Ce test s'intitulait « accepte une vidéo MP4
	// sous 512 Mo » et passait 500 Mo — il entérinait une garde applicative figée à
	// 512 Mo alors que la config du router plafonnait déjà à 64 Mo. Un cas de test
	// qui valide 8× la limite réelle ne teste pas la limite : il la cache.
	it("accepte une vidéo MP4 pile au plafond", async () => {
		await expect(
			middleware("catalogMedia")([
				{ name: "clip.mp4", type: "video/mp4", size: MAX_UPLOAD_SIZE_VIDEO },
			]),
		).resolves.toBeTruthy();
	});

	it("rejette une vidéo MP4 d'un octet au-delà du plafond", async () => {
		await expect(
			middleware("catalogMedia")([
				{ name: "clip.mp4", type: "video/mp4", size: MAX_UPLOAD_SIZE_VIDEO + 1 },
			]),
		).rejects.toThrow(/trop volumineux/);
	});

	it("rejette le lot entier dès qu'un seul fichier est invalide", async () => {
		await expect(
			middleware("catalogMedia")([IMAGE, { name: "x.svg", type: "image/svg+xml", size: 10 }]),
		).rejects.toBeInstanceOf(UploadThingError);
	});
});
