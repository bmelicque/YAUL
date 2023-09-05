import { createComputed } from "../src/computed";
import { createSignal } from "../src/signal";

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
