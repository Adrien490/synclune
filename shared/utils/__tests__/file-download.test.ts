import { describe, it, expect, vi, beforeEach } from "vitest";
import { downloadCSV, downloadJSON, downloadBlob } from "../file-download";

describe("downloadBlob", () => {
	let appendChildSpy: ReturnType<typeof vi.fn>;
	let removeChildSpy: ReturnType<typeof vi.fn>;
	let clickSpy: ReturnType<typeof vi.fn>;
	let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
	let createObjectURLSpy: ReturnType<typeof vi.fn>;
	let mockLink: {
		href: string;
		download: string;
		style: { visibility: string };
		click: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		clickSpy = vi.fn();
		mockLink = { href: "", download: "", style: { visibility: "" }, click: clickSpy };
		appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
		removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);
		createObjectURLSpy = vi.fn().mockReturnValue("blob:test-url");
		revokeObjectURLSpy = vi.fn();
		vi.stubGlobal("URL", {
			createObjectURL: createObjectURLSpy,
			revokeObjectURL: revokeObjectURLSpy,
		});
		vi.spyOn(document, "createElement").mockReturnValue(mockLink as unknown as HTMLAnchorElement);
	});

	it("creates a download link and clicks it", () => {
		const blob = new Blob(["test"], { type: "text/plain" });
		downloadBlob(blob, "test.txt");

		expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
		expect(appendChildSpy).toHaveBeenCalled();
		expect(clickSpy).toHaveBeenCalled();
		expect(removeChildSpy).toHaveBeenCalled();
		expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:test-url");
	});

	it("sets href to the object URL on the link element", () => {
		const blob = new Blob(["data"], { type: "text/plain" });
		downloadBlob(blob, "file.txt");

		expect(mockLink.href).toBe("blob:test-url");
	});

	it("sets the download filename on the link element", () => {
		const blob = new Blob(["data"], { type: "text/plain" });
		downloadBlob(blob, "my-export.csv");

		expect(mockLink.download).toBe("my-export.csv");
	});

	it("sets link visibility to hidden", () => {
		const blob = new Blob(["data"], { type: "text/plain" });
		downloadBlob(blob, "hidden.txt");

		expect(mockLink.style.visibility).toBe("hidden");
	});

	it("removes the link from DOM after clicking", () => {
		const blob = new Blob(["data"], { type: "text/plain" });
		downloadBlob(blob, "cleanup.txt");

		expect(removeChildSpy).toHaveBeenCalled();
	});
});

describe("downloadCSV", () => {
	let appendChildSpy: ReturnType<typeof vi.fn>;
	let clickSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		clickSpy = vi.fn();
		appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
		vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);
		vi.stubGlobal("URL", {
			createObjectURL: vi.fn().mockReturnValue("blob:csv-url"),
			revokeObjectURL: vi.fn(),
		});
		vi.spyOn(document, "createElement").mockReturnValue({
			href: "",
			download: "",
			style: { visibility: "" },
			click: clickSpy,
		} as unknown as HTMLAnchorElement);
	});

	it("decodes base64 CSV and downloads it", () => {
		// "Name,Value\n" in base64
		const csv = btoa("Name,Value\n");
		downloadCSV(csv, "export.csv");

		expect(appendChildSpy).toHaveBeenCalled();
		expect(clickSpy).toHaveBeenCalled();
	});

	it("calls onError when base64 is invalid", () => {
		const onError = vi.fn();
		downloadCSV("%%%invalid-base64%%%", "export.csv", onError);
		expect(onError).toHaveBeenCalled();
	});
});

describe("downloadJSON", () => {
	let appendChildSpy: ReturnType<typeof vi.fn>;
	let clickSpy: ReturnType<typeof vi.fn>;
	let mockLink: {
		href: string;
		download: string;
		style: { visibility: string };
		click: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		clickSpy = vi.fn();
		mockLink = { href: "", download: "", style: { visibility: "" }, click: clickSpy };
		appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
		vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);
		vi.stubGlobal("URL", {
			createObjectURL: vi.fn().mockReturnValue("blob:json-url"),
			revokeObjectURL: vi.fn(),
		});
		vi.spyOn(document, "createElement").mockReturnValue(mockLink as unknown as HTMLAnchorElement);
	});

	it("downloads JSON data as a file", () => {
		downloadJSON({ key: "value" }, "data.json");

		expect(appendChildSpy).toHaveBeenCalled();
		expect(clickSpy).toHaveBeenCalled();
	});

	it("sets the filename on the link", () => {
		downloadJSON({ key: "value" }, "export.json");

		expect(mockLink.download).toBe("export.json");
	});

	it("sets link visibility to hidden", () => {
		downloadJSON({ key: "value" }, "data.json");

		expect(mockLink.style.visibility).toBe("hidden");
	});

	it("revokes the object URL after download", () => {
		const revokeObjectURL = vi.fn();
		vi.stubGlobal("URL", {
			createObjectURL: vi.fn().mockReturnValue("blob:json-url"),
			revokeObjectURL,
		});

		downloadJSON({ key: "value" }, "data.json");

		expect(revokeObjectURL).toHaveBeenCalledWith("blob:json-url");
	});

	it("calls onError for circular reference", () => {
		const onError = vi.fn();
		const circular: Record<string, unknown> = {};
		circular.self = circular;
		downloadJSON(circular, "data.json", onError);
		expect(onError).toHaveBeenCalled();
	});

	it("does not throw when onError is undefined and serialization fails", () => {
		const circular: Record<string, unknown> = {};
		circular.self = circular;
		expect(() => downloadJSON(circular, "data.json")).not.toThrow();
	});

	it("downloads arrays", () => {
		downloadJSON([1, 2, 3], "list.json");

		expect(appendChildSpy).toHaveBeenCalled();
		expect(clickSpy).toHaveBeenCalled();
	});
});

describe("downloadCSV - UTF-8 accented characters", () => {
	beforeEach(() => {
		vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
		vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);
		vi.stubGlobal("URL", {
			createObjectURL: vi.fn().mockReturnValue("blob:csv-url"),
			revokeObjectURL: vi.fn(),
		});
		vi.spyOn(document, "createElement").mockReturnValue({
			href: "",
			download: "",
			style: { visibility: "" },
			click: vi.fn(),
		} as unknown as HTMLAnchorElement);
	});

	it("handles accented characters without throwing", () => {
		// "Prénom,Étoile\n" encoded in base64
		const csv = btoa(unescape(encodeURIComponent("Prénom,Étoile\n")));
		expect(() => downloadCSV(csv, "accents.csv")).not.toThrow();
	});
});
