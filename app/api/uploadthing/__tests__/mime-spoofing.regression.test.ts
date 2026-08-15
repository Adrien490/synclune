/**
 * @regression uploadthing-mime-spoofing-route-rejects
 *
 * MIME spoofing defense — au niveau de la ROUTE.
 *
 * Historique (audit média M1) : la suite précédente n'assertait que sur le
 * service `validateImageDimensions`, qui rejetait bien un `.exe` renommé
 * `.jpg`. Mais le route handler AVALAIT ce rejet (`rejectImageBomb` ne traitait
 * que `ImageDimensionsTooLargeError` et se contentait d'un `Sentry.captureException`
 * pour tout le reste), puis `stripImageMetadata` retournait `null` et
 * `generateBlurSafe` `undefined` — tous deux best-effort. Résultat :
 * `onUploadComplete` renvoyait un SUCCÈS avec l'URL du blob arbitraire, publié
 * sur le CDN. Le test était vert alors que la défense ne protégeait rien.
 *
 * Ces tests exercent donc `ourFileRouter.<route>.onUploadComplete` et vérifient
 * que l'upload est REJETÉ et le blob SUPPRIMÉ.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UploadThingError } from "uploadthing/server";

const { mockDownloadImage, mockDeleteFiles, mockUploadFiles, mockGenerateThumbHash } = vi.hoisted(
	() => {
		// `core.ts` throw à l'import si le token est absent (garde de démarrage).
		process.env.UPLOADTHING_TOKEN ??= "test-token";
		return {
			mockDownloadImage: vi.fn(),
			mockDeleteFiles: vi.fn(),
			mockUploadFiles: vi.fn(),
			mockGenerateThumbHash: vi.fn(),
		};
	},
);

vi.mock("@/modules/media/services/image-downloader.service", async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return { ...actual, downloadImage: mockDownloadImage };
});

vi.mock("@/shared/lib/uploadthing", () => ({
	utapi: { deleteFiles: mockDeleteFiles, uploadFiles: mockUploadFiles },
}));

vi.mock("@/modules/media/services/generate-thumbhash", () => ({
	generateThumbHashFromBuffer: mockGenerateThumbHash,
}));

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
	captureMessage: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("@/modules/admin-auth/lib/require-admin", () => ({ requireAdminApiRoute: vi.fn() }));
// On laisse Sharp réel — c'est le coeur de la défense.
import { ImageDecodeError } from "@/modules/media/services/image-downloader.service";
import { ourFileRouter } from "../core";

/** Magic bytes "MZ" (0x4D 0x5A) + PE stub — exécutable Windows renommé .jpg. */
const PE_STUB = Buffer.from([
	0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00,
	0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

const SPOOFED_FILE = {
	ufsUrl: "https://utfs.io/f/spoofed.jpg",
	key: "spoofed-key",
	name: "invoice.jpg",
	type: "image/jpeg",
	size: 1024,
};

type UploadCompleteArgs = {
	metadata: { userId: string; userName: string | null };
	file: typeof SPOOFED_FILE;
};

/** Accès typé au callback interne du FileRouter UploadThing (v7). */
function onUploadComplete(route: "catalogMedia") {
	const def = ourFileRouter[route] as unknown as {
		onUploadComplete: (args: UploadCompleteArgs) => Promise<unknown>;
	};
	return def.onUploadComplete;
}

beforeEach(() => {
	vi.clearAllMocks();
	mockDeleteFiles.mockResolvedValue({ success: true, deletedCount: 1 });
});

describe.each(["catalogMedia"] as const)(
	"%s — un contenu non décodable est rejeté par la route",
	(route) => {
		it("rejette l'upload et supprime le blob quand le contenu n'est pas une image", async () => {
			// downloadImage lève ImageDecodeError comme le ferait la vérif magic bytes.
			mockDownloadImage.mockRejectedValue(new ImageDecodeError(new Error("unsupported format")));

			const resolver = onUploadComplete(route);

			await expect(
				resolver({ metadata: { userId: "u1", userName: "Admin" }, file: SPOOFED_FILE }),
			).rejects.toBeInstanceOf(UploadThingError);

			// Le blob arbitraire NE DOIT PAS rester sur le CDN.
			expect(mockDeleteFiles).toHaveBeenCalledWith(["spoofed-key"]);
		});

		it("n'expose jamais l'URL du blob spoofé en cas de rejet", async () => {
			mockDownloadImage.mockRejectedValue(new ImageDecodeError(new Error("unsupported format")));

			const resolver = onUploadComplete(route);
			const outcome = await resolver({
				metadata: { userId: "u1", userName: "Admin" },
				file: SPOOFED_FILE,
			}).catch((err: unknown) => err);

			expect(outcome).toBeInstanceOf(UploadThingError);
			expect(JSON.stringify(outcome)).not.toContain("spoofed.jpg");
		});
	},
);

describe("Sharp — la validation magic bytes reste la défense de fond", () => {
	it("ne décode pas un PE32 renommé .jpg", async () => {
		const sharp = (await import("sharp")).default;

		await expect(sharp(PE_STUB).metadata()).rejects.toThrow();
	});
});
