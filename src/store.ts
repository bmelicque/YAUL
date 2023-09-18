import { $DEPENDENCIES, $UPDATER } from "./computed";
import { $EMIT, $ID, $LISTENERS, $NODES, $VALUE, Signal, createSignal, isSignal, signalPrototype } from "./signal";

/**
 * Maps the type to a Store if possible, else to a Signal
 */
export type Reactive<Type> = Type extends object ? Store<Type> : Signal<Type>;

/**
 * Goes from Store type to plain type
 */
type Unwrap<Type> = Type extends Store<infer T> ? T : Type;

/**
 * Asserts that the given key is present in the given generic type.
 *
 * Used to strip signals of function properties (name, length, prototype)
 */
type AssertInType<Type, Key extends string> = Type extends { [key in Key]: infer T } ? Reactive<T> : never;

export type Store<Type extends object> = Signal<Type> & {
	[Prop in keyof Type]: Reactive<Type[Prop]>;
} & {
	length: AssertInType<Type, "length">;
	name: AssertInType<Type, "name">;
	prototype: AssertInType<Type, "prototype">;
	[$TARGET]: Store<Type>;
};

const $TARGET = Symbol();
const INTERNALS = [$ID, $VALUE, $NODES, $LISTENERS, $DEPENDENCIES, $UPDATER] as const;
function isInternal(prop: any): prop is (typeof INTERNALS)[number] {
	return INTERNALS.indexOf(prop) !== -1;
}

const storePrototype = {
	set<Type extends object>(this: Store<Type>, value: Type | ((_: Type) => Type)): boolean {
		value = typeof value === "function" ? value(this[$VALUE]) : value;
		if (typeof value !== "object" || value === null) throw new Error("The value of a store must be an object");
		let hasChanged = false;
		// double check for common keys of value and this in BOTH loops because of non-iterable properties (like length for arrays)
		// TODO: consider using a WeakSet to prevent checking the same keys both times?
		for (const key in this) {
			if (key === "set") continue;
			if (value.hasOwnProperty(key)) {
				hasChanged ||= this[key as keyof typeof this].set(value[key as keyof typeof value]);
			} else {
				delete this[key as keyof typeof this];
				hasChanged = true;
			}
		}
		for (const key in value) {
			// all keys might not have been created
			// use of $TARGET to get the prop on the target object, else it would get the key in $VALUE and create a signal
			if (this.hasOwnProperty(key)) {
				hasChanged ||= this[key].set(value[key]);
			}
			hasChanged ||= this[$VALUE][key] !== value[key];
		}
		this[$VALUE] = value as any;
		if (hasChanged) this[$EMIT]();
		return hasChanged;
	},
};
Object.setPrototypeOf(storePrototype, signalPrototype);

const handler = {
	get<Type extends object>(target: Store<Type>, prop: keyof Store<Type>, proxy: Store<Type>) {
		if (prop === $TARGET) {
			return target;
		}
		// non-internal owned properties are signal reflects of $VALUE keys
		if (isInternal(prop) || target.hasOwnProperty(prop)) {
			return target[prop];
		}
		if (signalPrototype.hasOwnProperty(prop)) {
			return target[prop].bind(target); // .set() and [$EMIT]()
		}
		if (prop in target[$VALUE]) {
			const value = (target[$VALUE] as any)[prop];
			switch (typeof value) {
				case "function": // methods
					// without bind, the method is a loose function with this === undefined
					return value.bind(proxy); // proxy will handle setters that might be called in the method
				case "object": // object data
					// if null, fallthrough to primitive handling
					if (value !== null) {
						target[prop] ??= createStore(value) as any;
						return target[prop];
					}
				default: // primitive data
					if (target[prop] === undefined) {
						target[prop] = createSignal(value) as any;
						// unlike sub-stores which hold a reference to the value to update, sub-signals need a listener to update the primitive value
						target[prop][$LISTENERS] = [(value: any) => ((target[$VALUE] as any)[prop] = value)];
					}
					return target[prop];
			}
		}
	},

	set(target: any, prop: any, value: any) {
		if (isInternal(prop)) {
			target[prop] = value;
		} else if (target.hasOwnProperty(prop) && isSignal(target[prop])) {
			target[prop].set(isSignal(value) ? value[$VALUE] : value);
		} else {
			target[prop] = isSignal(value) ? value : createSignal(value);
		}
		target[$EMIT]();
		return true;
	},
};

/**
 * Creates a complex reactive value.
 *
 * Each of its values is either a store (if an object) or a signal (if a primitive).
 * Those are created lazily on the first access.
 * Store themselves behave as primitives
 * @param init The intial value of the store. Must be an object.
 * @throws If the provided value is not an object.
 * @see `createSignal`
 */
export function createStore<Type extends object>(init: Type): Store<Type> {
	if (typeof init !== "object" || init === null) throw new Error("The initial value of a store must be an object");

	return new Proxy(Object.setPrototypeOf(createSignal(init) as Store<Type>, storePrototype), handler as any);
}
