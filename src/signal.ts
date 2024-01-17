import { Context } from "./context";
import { updateOrReplaceNode } from "./dom";

export interface Signal<Type> {
	(): Type;
	set: {
		(newValue: Type): boolean;
		(setter: (current: Type) => Type): boolean;
	};

	// private properties
	readonly [$id]: number;
	[$value]: Type;
	[$nodes]?: Node[];
	[$listeners]?: ((value: Type) => void)[];
	// events
	[$emit]: () => void;
	[$detachNode]: (node: Node) => void;
	[$destroy]: () => void;
}

export const $id = Symbol("id");
export const $value = Symbol("value");
export const $nodes = Symbol("nodes");
export const $listeners = Symbol("listeners");
export const $dependencies = Symbol("dependencies");
export const $updater = Symbol("updater");
export const $emit = Symbol("emit");
export const $detachNode = Symbol("detach node");
export const $destroy = Symbol("destroy");

// Defining a Signal prototype that has the necessary methods and inherits form Function
export const signalPrototype = {
	set<Type>(this: Signal<Type>, value: Type | ((_: Type) => Type)): boolean {
		// @ts-ignore
		value = (typeof value === "function" ? value(this[$value]) : value) as Type;
		if (this[$value] === value) {
			return false;
		}
		this[$value] = value;
		this[$emit]();
		return true;
	},

	[$emit]<Type>(this: Signal<Type>) {
		if (this[$nodes]) {
			for (const node of this[$nodes]) {
				updateOrReplaceNode(node, this[$value]);
			}
		}
		if (this[$listeners]) {
			for (const listener of this[$listeners]) {
				listener(this[$value]);
			}
		}
	},

	[$detachNode](this: Signal<unknown>, node: Node) {
		if (!this[$nodes]) return;
		// TODO: optimize this?
		this[$nodes].filter((n) => n !== node);
		if (!this[$nodes].length && !this[$listeners]?.length) {
			this[$destroy]();
		}
	},

	[$destroy]() {},
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
 */
export function createSignal<Type>(init: Type): Signal<Type> {
	const signal: any = function (): Type {
		creationContext.consume(signal);
		return signal[$value];
	};
	Object.defineProperty(signal, "length", {
		writable: true,
	});
	delete signal.length;
	signal[$id] = generateId();
	signal[$value] = init;
	Object.setPrototypeOf(signal, signalPrototype);
	return signal as Signal<Type>;
}

/**
 * Checks if a value is a Signal
 */
export function isSignal(value: unknown): value is Signal<any> {
	return typeof value === "function" && $id in value;
}

// Computed values are here instead of a separate file to prevent import order issues

interface Computed<Type> extends Signal<Type> {
	[$dependencies]: Signal<any>[];
	[$updater]: () => void;
}

const computedPrototype = {
	[$destroy](this: Computed<any>) {
		for (const dependency of this[$dependencies]) {
			dependency[$listeners]?.filter((listener) => listener !== this[$updater]);
			if (!dependency[$listeners]?.length && !dependency[$nodes]?.length) {
				dependency[$destroy]();
			}
		}
	},
};
Object.setPrototypeOf(computedPrototype, signalPrototype);

export const creationContext = new Context((context: Computed<any>, value: Signal<any>) => {
	context[$dependencies].push(value);
	value[$listeners] ??= [];
	value[$listeners].push(context[$updater]);
});

/**
 * Creates a computed value.
 * Acts as a signal, which is updated when its dependencies change.
 * On creation, detects signals used for its creation and will listen to them.
 */
export function createComputed<Type>(expr: () => Type): Computed<Type> {
	const computed = Object.setPrototypeOf(createSignal<Type>(undefined as any), computedPrototype) as Computed<Type>;
	computed[$dependencies] = [];
	computed[$updater] = () => computed.set(expr());
	computed[$value] = creationContext.run(expr, computed);
	return computed;
}
