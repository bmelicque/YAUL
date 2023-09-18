import { creationContext } from "./computed";
import { updateOrReplaceNode } from "./dom";

export interface Signal<Type> {
	(): Type;
	set: {
		(newValue: Type): boolean;
		(setter: (current: Type) => Type): boolean;
	};

	// private properties
	readonly [$ID]: number;
	[$VALUE]: Type;
	[$NODES]?: Node[];
	[$LISTENERS]?: ((value: Type) => void)[];
	// events
	[$EMIT]: () => void;
}

export const $ID = Symbol("id");
export const $VALUE = Symbol("value");
export const $NODES = Symbol("nodes");
export const $LISTENERS = Symbol("listeners");
export const $EMIT = Symbol("emit");

// Defining a Signal prototype that has the necessary methods and inherits form Function
export const signalPrototype = {
	set<Type>(this: Signal<Type>, value: Type | ((_: Type) => Type)): boolean {
		// @ts-ignore
		value = (typeof value === "function" ? value(this[$VALUE]) : value) as Type;
		if (this[$VALUE] === value) {
			return false;
		}
		this[$VALUE] = value;
		this[$EMIT]();
		return true;
	},

	[$EMIT]<Type>(this: Signal<Type>) {
		if (this[$NODES]) {
			for (const node of this[$NODES]) {
				updateOrReplaceNode(node, this[$VALUE]);
			}
		}
		if (this[$LISTENERS]) {
			for (const listener of this[$LISTENERS]) {
				listener(this[$VALUE]);
			}
		}
	},
};

/**
 * Generates a new unique id
 */
const generateId = (
	(_: number) => () =>
		_++
)(0);

/**
 * Creates a reactive value. The signal itself is a getter function that returns the unwrapped value.
 * It also has a .set() method to update the value.
 *
 * @param init The initial value of the signal
 * @returns
 */
export function createSignal<Type>(init: Type): Signal<Type> {
	const signal: any = function (): Type {
		creationContext.consume(signal);
		return signal[$VALUE];
	};
	Object.defineProperty(signal, "length", {
		writable: true,
	});
	delete signal.length;
	signal[$ID] = generateId();
	signal[$VALUE] = init;
	Object.setPrototypeOf(signal, signalPrototype);
	return signal as Signal<Type>;
}

/**
 * Checks if a value is a Signal
 */
export function isSignal(value: unknown): value is Signal<any> {
	return typeof value === "function" && $ID in value;
}
