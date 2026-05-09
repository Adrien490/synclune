import { describe, it, expect } from "vitest";

import { extractServerErrors } from "../extract-server-errors";
import { ActionStatus } from "@/shared/types/server-action";

describe("extractServerErrors", () => {
	it("returns [] for undefined state", () => {
		expect(extractServerErrors(undefined)).toEqual([]);
	});

	it("returns [] when state is missing the status field (defensive)", () => {
		// @ts-expect-error — feeding a non-ActionState shape on purpose
		expect(extractServerErrors({ message: "ignored" })).toEqual([]);
	});

	it("returns [] for SUCCESS state (silent — no message to surface)", () => {
		expect(
			extractServerErrors({
				status: ActionStatus.SUCCESS,
				message: "Created",
			}),
		).toEqual([]);
	});

	it("returns [] for WARNING state (non-blocking)", () => {
		expect(
			extractServerErrors({
				status: ActionStatus.WARNING,
				message: "Heads up",
			}),
		).toEqual([]);
	});

	it("returns [] for INITIAL state", () => {
		expect(
			extractServerErrors({
				status: ActionStatus.INITIAL,
				message: "",
			}),
		).toEqual([]);
	});

	it("returns the message for ERROR state", () => {
		expect(
			extractServerErrors({
				status: ActionStatus.ERROR,
				message: "Boom",
			}),
		).toEqual(["Boom"]);
	});

	it("returns the message for VALIDATION_ERROR state", () => {
		expect(
			extractServerErrors({
				status: ActionStatus.VALIDATION_ERROR,
				message: "Champ requis",
			}),
		).toEqual(["Champ requis"]);
	});

	it("returns the message for FORBIDDEN state", () => {
		expect(
			extractServerErrors({
				status: ActionStatus.FORBIDDEN,
				message: "Accès refusé",
			}),
		).toEqual(["Accès refusé"]);
	});

	it("returns the message for UNAUTHORIZED state", () => {
		expect(
			extractServerErrors({
				status: ActionStatus.UNAUTHORIZED,
				message: "Connectez-vous",
			}),
		).toEqual(["Connectez-vous"]);
	});

	it("returns the message for NOT_FOUND state", () => {
		expect(
			extractServerErrors({
				status: ActionStatus.NOT_FOUND,
				message: "Introuvable",
			}),
		).toEqual(["Introuvable"]);
	});

	it("returns [] when an error state has an empty message string", () => {
		expect(
			extractServerErrors({
				status: ActionStatus.ERROR,
				message: "",
			}),
		).toEqual([]);
	});

	it("returns [] when an error state has a non-string message (defensive)", () => {
		expect(
			extractServerErrors({
				status: ActionStatus.ERROR,
				// @ts-expect-error — non-string message on purpose
				message: 42,
			}),
		).toEqual([]);
	});
});
