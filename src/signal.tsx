import { updateNode } from "./dom";
import { listenContext, runWith } from "./context";

export const $ID = Symbol("id");
export const $UPDATER = Symbol("updater");
export const $VALUE = Symbol("value");
export const $DEPENDENCIES = Symbol("dependencies");
export const $COMPONENT_HANDLERS = Symbol("handlers");
export const $NODES = Symbol("nodes");
export const $OWNER = Symbol("owner");
export const $LISTENERS = Symbol("listeners");
export const $ADD_LISTENER = Symbol();
export const $ADD_DEPENDENCY = Symbol();
export const $ADD_NODE = Symbol();
export const $EMIT = Symbol();

type primitive = bigint | boolean | null | number | string | symbol | undefined;

type Reactive<Type> = Type extends {} ? { [K in keyof Type]: Reactive<Type[K]> } & Signal<Type> : Type & Signal<Type>;
// type Reactive<Type> = Type;

export const generateId = (
	(_: number) => () =>
		_++
)(0);

function isPrimitive(value: any): value is primitive {
	return value === null || (typeof value !== "object" && typeof value !== "function");
}

function isObject(value: any): value is object {
	return typeof value === "object" && value !== null;
}

// // TODO: see if still relevant; use instanceof Signal
// // @ts-ignore
// export function isSignal<Type>(value: Type): value is Signal<Type> {
// 	return isObject(value) && (value as any)[$ID] !== undefined;
// }

// @ts-ignore
export function isSignal<Type>(value: Reactive<Type>): value is Signal<Type> {
	return value instanceof Signal;
}

export class Signal<Type> {
	readonly [$ID]!: number;
	[$VALUE]!: Type;
	[$LISTENERS]?: ((value: Type) => void)[];
	[$NODES]?: Node[];

	constructor(value: Type) {
		Object.defineProperties(this, {
			[$ID]: { value: generateId() },
			[$VALUE]: { value, writable: true },
		});
	}

	[Symbol.toPrimitive]() {
		if (this[$VALUE] === null || (typeof this[$VALUE] !== "object" && typeof this[$VALUE] !== "function")) {
			return this[$VALUE];
		}
		return this[$VALUE];
	}

	/**
	 * Triggers listeners
	 */
	[$EMIT](): void {
		console.log("---- EMITTING ----");
		console.log("this: ", this, this[$LISTENERS], this[$VALUE]);

		if (isObject(this[$VALUE])) {
			for (const key in this[$VALUE]) {
				console.log(key, this[$VALUE], this[$VALUE][key]);
			}
		}

		if (this[$LISTENERS]) {
			for (const listener of this[$LISTENERS]) {
				listener(this[$VALUE]);
			}
		}

		if (this[$NODES]) {
			for (let i = 0; i < this[$NODES].length; i++) {
				this[$NODES][i] = updateNode(this[$NODES][i], this[$VALUE]);
			}
		}
	}

	/**
	 * Adds a new listener function that will be called on value update.
	 * @param listener The function that will be called. No argument is given.
	 */
	[$ADD_LISTENER](listener: (value: Type) => void): void {
		if (!this[$LISTENERS]) {
			Object.defineProperty(this, $LISTENERS, { value: [listener] });
		} else if (this[$LISTENERS].indexOf(listener) === -1) {
			this[$LISTENERS].push(listener);
		}
	}

	[$ADD_NODE](node: Node): void {
		this[$NODES]?.push(node) ?? Object.defineProperty(this, $NODES, { value: [node] });
	}
}

export class Computed<Type> extends Signal<Type> {
	[$UPDATER]!: () => Type;
	[$DEPENDENCIES]!: Signal<any>[];

	constructor(expression: () => Type) {
		super(undefined as any);
		Object.defineProperties(this, {
			[$UPDATER]: { value: () => ((this[$VALUE] = expression()), this[$EMIT]) },
			[$DEPENDENCIES]: { value: [] },
		});
		// This next line will trigger attachement to dependencies. It needs this[$DEPENDENCIES] to be defined.
		this[$VALUE] = runWith(this, expression);
	}
}

const handler = {
	get(target: Reactive<any>, prop: string | symbol) {
		if (prop === Symbol.toPrimitive) {
			console.log("get: ", target, target[prop]);

			// return target[prop]();
		}
		if (target[prop] !== undefined) return target[prop];
		listenContext(target);
		const value = target[$VALUE][prop];
		return typeof value === "function" ? value.bind(target[$VALUE]) : value;
	},

	set(target: any, prop: string | symbol, value: any): boolean {
		if (prop === Symbol.toPrimitive) {
			target[Symbol.toPrimitive] = value;
			return true;
		}
		console.log("target ", target);
		console.log("prop ", prop);
		console.log("value ", value);

		target[prop] !== undefined ? (target[prop] = value) : (target[$VALUE][prop][$VALUE] = value);
		// Needs the new value to be set before emitting
		target[$EMIT]();
		return true;
	},

	deleteProperty(target: any, prop: string | symbol) {
		// TODO: be ready to clean up
		return delete target[prop];
	},
};

export function createSignal<Type extends primitive>(value: Type) {
	const p = new Proxy(new Signal(value), handler);
	p[Symbol.toPrimitive] = function () {
		return this[$VALUE];
	};
	return p as Type;
}

/**
 * Creates a reactive store.
 * @param init The inital value of the store, must be an object (functions will throw)
 * @throws if the param is not an object
 * @returns The reactive store, typed as the initial value
 */
export function createStore<Type extends object>(init: Type) {
	if (!isObject(init)) {
		throw new Error(); //TODO
	}
	const res: any = {};
	for (const prop in init) {
		const value = init[prop];
		res[prop] = isObject(value) ? createStore(value) : isPrimitive(value) ? createSignal(value) : (undefined as never);
	}
	return new Proxy(new Signal(res), handler) as Type;
}

/**
 * Creates a computed value. The source stores will be detected automatically.
 * @param expression The expression that will be evaluated on updates. It should return the new value.
 * @returns A reactive value that will update automatically
 */
export function createComputed<Type>(expression: () => Type) {
	if (typeof expression !== "function") {
		throw new Error(); // TODO
	}
	return new Proxy(new Computed(expression), handler) as Type;
}

/**
 * Converts a signal to its value
 * @param value The signal to unwrap
 * @returns The signal's value
 */
// function unwrap<Type>(value: Reactive<Type>): Type {
// 	// TODO handle arrays
// 	if (!isSignal(value)) return value;
// 	value = value[$VALUE];
// 	if (isPrimitive(value)) return value;
// 	const unwrapped: Type = { ...value };
// 	for (const key in unwrapped) {
// 		unwrapped[key] = unwrap(unwrapped[key] as any);
// 	}
// 	return unwrapped;
// }

// // ----- CONSOLE.LOG -----
// // no more need for wrappers around primitives, just be new Proxy({[$VALUE], ...}) as new value.constructor()
// const log = console.log;
// console.log = function (...data: any[]) {
// 	data = data.map(unwrap);
// 	log(...data);
// };
// // -----------------------
// // TODO
// console.debug;
// console.error;
// //etc.
