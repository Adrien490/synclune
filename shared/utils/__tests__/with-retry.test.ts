import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { withRetry } from "../with-retry"
import * as delayModule from "../delay"

describe("withRetry", () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.restoreAllMocks()
		vi.useRealTimers()
	})

	it("should return the result on first successful attempt", async () => {
		const fn = vi.fn().mockResolvedValue("success")
		const result = await withRetry(fn)
		expect(result).toBe("success")
		expect(fn).toHaveBeenCalledTimes(1)
	})

	it("should retry on failure and succeed on the second attempt", async () => {
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error("first failure"))
			.mockResolvedValue("success")

		const promise = withRetry(fn, { baseDelay: 100 })
		// Advance past the first delay (100ms * 2^0 = 100ms)
		await vi.advanceTimersByTimeAsync(100)
		const result = await promise

		expect(result).toBe("success")
		expect(fn).toHaveBeenCalledTimes(2)
	})

	it("should retry the default 3 times before throwing", async () => {
		let callCount = 0
		const fn = vi.fn().mockImplementation(() => {
			callCount++
			return Promise.reject(new Error("persistent failure"))
		})

		const promise = withRetry(fn, { baseDelay: 100 }).catch((e) => e)
		// Advance through all delays: 100ms (attempt 0→1) + 200ms (attempt 1→2)
		await vi.advanceTimersByTimeAsync(300)
		const error = await promise

		expect(error.message).toBe("persistent failure")
		expect(fn).toHaveBeenCalledTimes(3)
	})

	it("should respect a custom maxAttempts", async () => {
		let callCount = 0
		const fn = vi.fn().mockImplementation(() => {
			callCount++
			return Promise.reject(new Error("fail"))
		})

		const promise = withRetry(fn, { maxAttempts: 5, baseDelay: 10 }).catch((e) => e)
		// Advance through delays: 10 + 20 + 40 + 80 = 150ms
		await vi.advanceTimersByTimeAsync(150)
		const error = await promise

		expect(error.message).toBe("fail")
		expect(fn).toHaveBeenCalledTimes(5)
	})

	it("should apply exponential backoff between retries", async () => {
		const delaySpy = vi.spyOn(delayModule, "delay")
		let callCount = 0
		const fn = vi.fn().mockImplementation(() => {
			callCount++
			return Promise.reject(new Error("fail"))
		})

		const promise = withRetry(fn, { maxAttempts: 3, baseDelay: 1000 }).catch((e) => e)
		await vi.advanceTimersByTimeAsync(3000)
		await promise

		// attempt 0 → delay(1000 * 2^0 = 1000), attempt 1 → delay(1000 * 2^1 = 2000)
		expect(delaySpy).toHaveBeenNthCalledWith(1, 1000)
		expect(delaySpy).toHaveBeenNthCalledWith(2, 2000)
	})

	it("should throw an AbortError when AbortSignal is already aborted before first attempt", async () => {
		const controller = new AbortController()
		controller.abort()
		const fn = vi.fn().mockResolvedValue("success")

		const promise = withRetry(fn, { signal: controller.signal })
		await expect(promise).rejects.toMatchObject({ name: "AbortError" })
		expect(fn).not.toHaveBeenCalled()
	})

	it("should rethrow a DOMException AbortError without retrying", async () => {
		const abortError = new DOMException("Operation aborted", "AbortError")
		const fn = vi.fn().mockRejectedValue(abortError)

		const promise = withRetry(fn, { baseDelay: 100 })
		await expect(promise).rejects.toMatchObject({ name: "AbortError" })
		// Should not retry on abort
		expect(fn).toHaveBeenCalledTimes(1)
	})

	it("should throw immediately when isRetryable returns false", async () => {
		const nonRetryableError = new Error("non-retryable")
		const fn = vi.fn().mockRejectedValue(nonRetryableError)
		const isRetryable = vi.fn().mockReturnValue(false)

		await expect(
			withRetry(fn, { isRetryable, baseDelay: 100 })
		).rejects.toThrow("non-retryable")

		expect(fn).toHaveBeenCalledTimes(1)
		expect(isRetryable).toHaveBeenCalledWith(nonRetryableError)
	})

	it("should retry when isRetryable returns true", async () => {
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error("retryable"))
			.mockResolvedValue("ok")
		const isRetryable = vi.fn().mockReturnValue(true)

		const promise = withRetry(fn, { isRetryable, baseDelay: 50 })
		await vi.advanceTimersByTimeAsync(50)
		const result = await promise

		expect(result).toBe("ok")
		expect(fn).toHaveBeenCalledTimes(2)
	})

	it("should not delay after the last failed attempt", async () => {
		const delaySpy = vi.spyOn(delayModule, "delay")
		let callCount = 0
		const fn = vi.fn().mockImplementation(() => {
			callCount++
			return Promise.reject(new Error("fail"))
		})

		const promise = withRetry(fn, { maxAttempts: 2, baseDelay: 1000 }).catch((e) => e)
		await vi.advanceTimersByTimeAsync(1000)
		await promise

		// With maxAttempts=2: only one delay call (between attempt 0 and 1), none after attempt 1
		expect(delaySpy).toHaveBeenCalledTimes(1)
		expect(delaySpy).toHaveBeenCalledWith(1000)
	})

	it("should wrap non-Error throws in an Error", async () => {
		const fn = vi.fn().mockRejectedValue("string error")

		const promise = withRetry(fn, { maxAttempts: 1 })
		await expect(promise).rejects.toThrow("string error")
	})

	it("should succeed on the third attempt with 3 max attempts", async () => {
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error("fail 1"))
			.mockRejectedValueOnce(new Error("fail 2"))
			.mockResolvedValue("final success")

		const promise = withRetry(fn, { maxAttempts: 3, baseDelay: 100 })
		// First delay: 100ms, second delay: 200ms
		await vi.advanceTimersByTimeAsync(300)
		const result = await promise

		expect(result).toBe("final success")
		expect(fn).toHaveBeenCalledTimes(3)
	})
})
