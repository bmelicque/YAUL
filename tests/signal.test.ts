import { createComputed, createSignal, isSignal } from "../src/signal";

describe("Signal type", () => {
	it("should be a getter function", () => {
		const x = createSignal(42);
		expect(x()).toBe(42);
	});

	it("should have a setter method", () => {
		const x = createSignal(0);
		x.set(42);
		expect(x()).toBe(42);
		x.set((value) => value * 2);
		expect(x()).toBe(84);
	});
});

describe("Computed type", () => {
	it("should get its value from given expression", () => {
		const a = createSignal(6);
		const b = createSignal(7);
		const x = createComputed(() => a() * b());
		expect(x()).toBe(42);
	});

	it("should react to changes in its dependencies", () => {
		const a = createSignal(6);
		const b = createSignal(7);
		const x = createComputed(() => a() * b());
		a.set((value) => value / 2);
		expect(x()).toBe(21);
		b.set((value) => value * 3);
		expect(x()).toBe(63);
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
