export const $ID = Symbol("id");
export const $EXPRESSION = Symbol("expression");
export const $VALUE = Symbol("value");
export const $DEPENDENCIES = Symbol("dependencies");
export const $DERIVED_SIGNALS = Symbol("derived");
export const $COMPONENT_HANDLERS = Symbol("handlers");
export const $NODES = Symbol("nodes");
export const $OWNER = Symbol("owner");
export const $LINK_COMPUTED = Symbol();
export const $ADD_DEPENDENCY = Symbol();
export const $EMIT = Symbol();
const INTERNALS = new Set<symbol | string>([
	$ID,
	$VALUE,
	$EXPRESSION,
	$DEPENDENCIES,
	$DERIVED_SIGNALS,
	$COMPONENT_HANDLERS,
	$NODES,
	$OWNER,
	$LINK_COMPUTED,
	$ADD_DEPENDENCY,
	$EMIT,
]);

type primitive = bigint | boolean | null | number | string | symbol | undefined;

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

// @ts-ignore
function isSignal<Type>(value: Type): value is Signal<Type> {
	return isObject(value) && (value as any)[$ID] !== undefined;
}

class Signal<Type> {
	readonly [$ID]!: number;
	[$VALUE]!: Type;
	[$DERIVED_SIGNALS]?: Computed<any>[];

	constructor(value: Type) {
		Object.defineProperties(this, {
			[$ID]: { value: generateId() },
			[$VALUE]: { value, writable: true },
		});
	}

	/**
	 * Signifies listeners of changes
	 */
	[$EMIT](): void {
		if (this[$DERIVED_SIGNALS]) {
			for (const computed of this[$DERIVED_SIGNALS]) {
				computed[$VALUE] = computed[$EXPRESSION]();
			}
		}
	}

	/**
	 * Links the signal to a computed value. The computed value will then listen to the signal changes.
	 * @param computed The computed value that will listen
	 */
	[$LINK_COMPUTED](computed: Computed<any>): void {
		if (this[$DERIVED_SIGNALS] === undefined) {
			Object.defineProperty(this, $DERIVED_SIGNALS, { value: [computed] });
		} else {
			this[$DERIVED_SIGNALS].push(computed);
		}
		computed[$DEPENDENCIES].push(this);
	}
}

class Computed<Type> extends Signal<Type> {
	[$EXPRESSION]!: () => Type;
	[$DEPENDENCIES]!: Signal<any>[];

	constructor(expression: () => Type) {
		super(undefined as any);
		computedStack.push(this);
		Object.defineProperties(this, {
			[$EXPRESSION]: { value: expression },
			[$DEPENDENCIES]: { value: [] },
		});
		// This next line will trigger attachement to dependencies. It needs this[$DEPENDENCIES] to be defined.
		this[$VALUE] = expression();
		computedStack.pop();
	}
}

const computedStack: Computed<any>[] = [];

const handler = {
	get(target: any, prop: string | symbol, receiver: any) {
		if (INTERNALS.has(prop)) return target[prop];
		if (computedStack.length) {
			receiver[$LINK_COMPUTED](computedStack[computedStack.length - 1]);
		}
		const value = target[$VALUE][prop];
		return typeof value === "function" ? value.bind(target[$VALUE]) : value;
	},

	set(target: any, prop: string | symbol, value: any): boolean {
		const success = INTERNALS.has(prop) ? (target[prop] = value) : (target[$VALUE][prop] = value);
		// Needs the new value to be set before emitting
		target[$EMIT];
		return success;
	},

	deleteProperty(target: any, prop: string | symbol) {
		// TODO: be ready to clean up
		return delete target[prop];
	},
};

function createSignal<Type extends primitive>(value: Type) {
	return new Proxy(new Signal(value), handler) as Type;
}

/**
 * Creates a reactive store.
 * @param init The inital value of the store, must be an object (functions will throw)
 * @throws if the param is not an object
 * @returns The reactive store, typed as the initial value
 */
export function createStore<Type extends object>(init: Type): Type {
	if (!isObject(init)) {
		throw new Error(); //TODO
	}
	const res: any = {};
	for (const prop in init) {
		const value = init[prop];
		res[prop] = isObject(value) ? createStore(value) : isPrimitive(value) ? createSignal(value) : (undefined as never);
	}
	return new Proxy(new Signal(init), handler) as Type;
}

/**
 * Creates a computed value. The source stores will be detected automatically.
 * @param expression The expression that will be evaluated on updates. It should return the new value.
 * @returns A reactive value that will update automatically
 */
export function createComputed<Type>(expression: () => Type): Type {
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
function unwrap<Type>(value: Type): Type {
	if (!isSignal(value)) return value;
	value = value[$VALUE];
	if (isPrimitive(value)) return value;
	const unwrapped: Type = { ...value };
	for (const key in unwrapped) {
		unwrapped[key] = unwrap(unwrapped[key] as any);
	}
	return unwrapped;
}

// ----- CONSOLE.LOG -----
// no more need for wrappers around primitives, just be new Proxy({[$VALUE], ...}) as new value.constructor()
const log = console.log;
console.log = function (...data: any[]) {
	data = data.map(unwrap);
	log(...data);
};
// -----------------------
// TODO
console.debug;
console.error;
//etc.
