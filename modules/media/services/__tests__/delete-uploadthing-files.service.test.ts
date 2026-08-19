/**
 * Suppression UploadThing — logique destructive et IRRÉVERSIBLE (pas de soft
 * delete dans ce dépôt) : filtrage de domaine, extraction de clés,
 * comptabilité deleted/failed (une clé déjà absente n'est PAS un échec).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteFilesMock, loggerMock } = vi.hoisted(() => ({
	deleteFilesMock: vi.fn(),
	loggerMock: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/shared/lib/uploadthing", () => ({ utapi: { deleteFiles: deleteFilesMock } }));
vi.mock("@/shared/lib/logger", () => ({ logger: loggerMock }));

import { deleteUploadThingFilesFromUrls } from "../delete-uploadthing-files.service";

const UT_URL_A = "https://utfs.io/f/keyAAA";
const UT_URL_B = "https://utfs.io/f/keyBBB";

beforeEach(() => {
	vi.clearAllMocks();
	deleteFilesMock.mockResolvedValue({ success: true, deletedCount: 1 });
});

describe("deleteUploadThingFilesFromUrls", () => {
	it("liste vide → aucun appel UTApi", async () => {
		const result = await deleteUploadThingFilesFromUrls([]);
		expect(result).toEqual({ deleted: 0, failed: 0 });
		expect(deleteFilesMock).not.toHaveBeenCalled();
	});

	it("filtre les URLs hors domaine UploadThing (ignorées, pas des échecs)", async () => {
		const result = await deleteUploadThingFilesFromUrls([
			"https://evil.com/f/x",
			"http://utfs.io/f/insecure",
		]);
		expect(result).toEqual({ deleted: 0, failed: 0 });
		expect(deleteFilesMock).not.toHaveBeenCalled();
		expect(loggerMock.warn).toHaveBeenCalledWith(
			expect.stringContaining("skipped"),
			expect.anything(),
		);
	});

	it("supprime par CLÉ extraite, jamais par URL brute", async () => {
		deleteFilesMock.mockResolvedValue({ success: true, deletedCount: 2 });
		const result = await deleteUploadThingFilesFromUrls([UT_URL_A, UT_URL_B]);
		expect(deleteFilesMock).toHaveBeenCalledWith(["keyAAA", "keyBBB"]);
		expect(result).toEqual({ deleted: 2, failed: 0 });
	});

	it("une clé déjà absente n'est PAS un échec (deletedCount < demandé)", async () => {
		deleteFilesMock.mockResolvedValue({ success: true, deletedCount: 1 });
		const result = await deleteUploadThingFilesFromUrls([UT_URL_A, UT_URL_B]);
		expect(result).toEqual({ deleted: 1, failed: 0 });
	});

	it("success=false → failed compte les CANDIDATS, pas les URLs ignorées", async () => {
		deleteFilesMock.mockResolvedValue({ success: false, deletedCount: 0 });
		const result = await deleteUploadThingFilesFromUrls([
			UT_URL_A,
			UT_URL_B,
			"https://evil.com/f/x",
		]);
		expect(result).toEqual({ deleted: 0, failed: 2 });
	});

	it("exception UTApi → failed = candidats, jamais de throw", async () => {
		deleteFilesMock.mockRejectedValue(new Error("network down"));
		const result = await deleteUploadThingFilesFromUrls([UT_URL_A]);
		expect(result).toEqual({ deleted: 0, failed: 1 });
		expect(loggerMock.error).toHaveBeenCalled();
	});
});
