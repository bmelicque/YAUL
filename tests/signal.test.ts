import { createSignal, isSignal } from "../src/signal-new";

describe("Signal type", () => {
	it("should be a getter function", () => {
		const x = createSignal(42);
		expect(x()).toBe(42);
	});

	it("should have a setter method", () => {
		const x = createSignal(0);
		expect(x.set(42)).toBe(42);
		expect(x.set((value) => value * 2)).toBe(84);
	});
});

describe("isSignal", () => {
	it("should return true, only with signals", () => {
		const x = createSignal(0);
		expect(isSignal(x)).toBe(true);
		expect(isSignal(24)).toBe(false);
		expect(isSignal(() => {})).toBe(false);
		expect(isSignal({})).toBe(false);
		expect(isSignal(null)).toBe(false);
	});
});
