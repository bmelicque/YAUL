import { updateOrReplaceNode } from "./dom-new";

export interface Signal<Type> {
	(): Type;
	set: {
		(newValue: Type): Type;
		(setter: (current: Type) => Type): Type;
	};

	// private properties
	readonly [$ID]: number;
	[$VALUE]: Type;
	[$NODES]?: Node[];
	// private methods
	[$ATTACH_NODE]: (node: Node) => void;
	// events
	[$EMIT]: () => void;
}

export const $ID = Symbol("id");
export const $VALUE = Symbol("value");
export const $NODES = Symbol("nodes");
export const $ATTACH_NODE = Symbol("attach nodes");
export const $EMIT = Symbol("emit");

// Defining a Signal prototype that has the necessary methods and inherits form Function
const prototype = {
	set<Type>(this: Signal<Type>, value: Type | ((_: Type) => Type)): Type {
		// @ts-ignore
		this[$VALUE] = typeof value === "function" ? value(this[$VALUE]) : value;
		this[$EMIT]();
		return this[$VALUE];
	},

	[$ATTACH_NODE]<Type>(this: Signal<Type>, node: Node) {
		this[$NODES] ??= [];
		this[$NODES].push(node);
	},

	[$EMIT]<Type>(this: Signal<Type>) {
		if (this[$NODES]) {
			for (const node of this[$NODES]) {
				updateOrReplaceNode(node, this[$VALUE]);
			}
		}
	},
};
Object.setPrototypeOf(prototype, Function.prototype);

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
		return signal[$VALUE];
	};
	signal[$ID] = generateId();
	signal[$VALUE] = init;
	Object.setPrototypeOf(signal, prototype);
	return signal as Signal<Type>;
}

/**
 * Checks if a value is a Signal
 */
export function isSignal(value: unknown): value is Signal<any> {
	return typeof value === "function" && $ID in value;
}
