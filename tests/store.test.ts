import { isSignal } from "../src/signal";
import { createStore } from "../src/store";

describe("Store type", () => {
	// Test for non-TS use
	it("may only be intialized with objects", () => {
		expect(() => createStore(0 as any)).toThrow();
		expect(() => createStore(null as any)).toThrow();
	});

	it("should be a valid signal", () => {
		const x = createStore({});
		expect(isSignal(x)).toBe(true);
	});

	it("should return a reactive value when properties are accessed", () => {
		const x = createStore({ counter: { value: 0 } });
		const y = x.counter;
		expect(isSignal(y)).toBe(true);
		const z = y.value;
		expect(isSignal(z)).toBe(true);
	});

	it("should be settable", () => {
		const s = createStore<Record<string, any>>({ key: "value" });
		s.set({ foo: "bar" });
		expect(s()).toEqual({ foo: "bar" });
		const t = s.foo;
		s.set({ foo: "baz" });
		expect(t()).toBe("baz");
	});
});
