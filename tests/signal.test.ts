import { $ID, $VALUE, Signal, createSignal } from "../src/signal";

describe("Signal class", () => {
	it("should have working internals", () => {
		const x = new Signal(0);
		expect(x[$VALUE]).toBe(0);
		expect(x[$ID] !== undefined);
	});
});

describe("createSignal's proxy", () => {
	it("should handle internals properly", () => {
		const signal = createSignal(1);
	});
});
