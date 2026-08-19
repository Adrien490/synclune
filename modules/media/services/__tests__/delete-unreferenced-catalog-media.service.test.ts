/**
 * Garde de références partagées — le scénario qu'elle ferme : un produit
 * DUPLIQUÉ partage ses blobs avec l'original (`duplicate-product` recopie
 * `url` tel quel) ; supprimer une image du doublon sans vérifier les
 * références rendait 404 l'image de l'original.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock, deleteFromUrlsMock, loggerMock } = vi.hoisted(() => ({
	findManyMock: vi.fn(),
	deleteFromUrlsMock: vi.fn(),
	loggerMock: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { productMedia: { findMany: findManyMock } },
}));
vi.mock("@/shared/lib/logger", () => ({ logger: loggerMock }));
vi.mock("../delete-uploadthing-files.service", () => ({
	deleteUploadThingFilesFromUrls: deleteFromUrlsMock,
}));

import { deleteUnreferencedCatalogMedia } from "../delete-unreferenced-catalog-media.service";

const SHARED_URL = "https://utfs.io/f/shared-blob";
const ORPHAN_URL = "https://utfs.io/f/orphan-blob";

beforeEach(() => {
	vi.clearAllMocks();
	findManyMock.mockResolvedValue([]);
	deleteFromUrlsMock.mockResolvedValue({ deleted: 1, failed: 0 });
});

describe("deleteUnreferencedCatalogMedia", () => {
	it("liste vide → aucune lecture DB, aucun delete", async () => {
		await deleteUnreferencedCatalogMedia([], { action: "test" });
		expect(findManyMock).not.toHaveBeenCalled();
		expect(deleteFromUrlsMock).not.toHaveBeenCalled();
	});

	it("PRÉSERVE un blob encore référencé par une ligne ProductMedia (produit dupliqué)", async () => {
		findManyMock.mockResolvedValue([{ url: SHARED_URL }]);
		await deleteUnreferencedCatalogMedia([SHARED_URL, ORPHAN_URL], { action: "test" });

		expect(deleteFromUrlsMock).toHaveBeenCalledWith([ORPHAN_URL]);
		expect(loggerMock.info).toHaveBeenCalledWith(
			expect.stringContaining("Preserved"),
			expect.objectContaining({ preserved: 1, deleted: 1 }),
		);
	});

	it("supprime tout quand plus rien ne référence les URLs", async () => {
		findManyMock.mockResolvedValue([]);
		await deleteUnreferencedCatalogMedia([ORPHAN_URL], { action: "test" });
		expect(deleteFromUrlsMock).toHaveBeenCalledWith([ORPHAN_URL]);
	});

	it("fail-safe : une erreur DB ne supprime RIEN et ne throw jamais", async () => {
		findManyMock.mockRejectedValue(new Error("DB down"));
		await expect(
			deleteUnreferencedCatalogMedia([ORPHAN_URL], { action: "test" }),
		).resolves.toBeUndefined();
		// En cas de doute on NE supprime PAS : un orphelin est un coût de
		// stockage, une suppression à tort est une 404 irréversible.
		expect(deleteFromUrlsMock).not.toHaveBeenCalled();
		expect(loggerMock.error).toHaveBeenCalled();
	});
});
