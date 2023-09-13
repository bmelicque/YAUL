import { $EMIT, $LISTENERS, $NODES, $VALUE, Signal, createSignal, signalPrototype } from "./signal";

/**
 * Maps the type to a Store if possible, else to a Signal
 */
type Reactive<Type> = Type extends object ? S<Type> : Signal<Type>;

/**
 * Goes from Store type to plain type
 */
type Unwrap<Type> = Type extends S<infer T> ? T : Type;

/**
 * Asserts that the given key is present in the given generic type.
 *
 * Used to strip signals of function properties (name, length, prototype)
 */
type AssertInType<Type, Key extends string> = Type extends { [key in Key]: infer T } ? Reactive<T> : never;

// This is just black magic...
type S<Type extends object> = Signal<Type> & {
	[Prop in keyof Type]: Reactive<Type[Prop]>;
};
type Store<Type extends object> = Signal<Type> & {
	// @ts-ignore
	[K in keyof S<Type>]: S<Type> extends () => any ? Unwrap<S<Type>>[K] : S<Type>[K];
} & {
	length: AssertInType<Type, "length">;
	name: AssertInType<Type, "name">;
	prototype: AssertInType<Type, "prototype">;
	[$TARGET]: Store<Type>;
};

const $TARGET = Symbol();

const storePrototype = {
	set<Type extends object>(this: Store<Type>, value: Type | ((_: Type) => Type)): boolean {
		value = typeof value === "function" ? value(this[$VALUE]) : value;
		if (typeof value !== "object" || value === null) throw new Error("The value of a store must be an object");
		let hasChanged = false;
		for (const key in this[$VALUE]) {
			// TODO: clean up signal
			// @ts-ignore
			if (!(key in value)) delete this[$VALUE][key];
		}
		for (const key in value) {
			// all keys might not have been created
			// use of $TARGET to get the prop on the target object, else it would get the key in $VALUE and create a signal
			// @ts-ignore
			if (this[$TARGET].hasOwnProperty(key)) hasChanged ||= this[key].set(value[key]);
		}
		this[$VALUE] = value as any;
		if (hasChanged) this[$EMIT]();
		return hasChanged;
	},
};
Object.setPrototypeOf(storePrototype, signalPrototype);

const handler = {
	get<Type extends object>(target: Store<Type>, prop: keyof Store<Type>, proxy: Store<Type>) {
		if (prop === $TARGET) return target;
		// @ts-ignore
		if (prop === "set" || prop === $EMIT) return target[prop].bind(proxy);
		if (target.hasOwnProperty(prop) || signalPrototype.hasOwnProperty(prop) || prop === $NODES) return target[prop];
		if (prop in target[$VALUE]) {
			const value = (target[$VALUE] as any)[prop];
			switch (typeof value) {
				case "function":
					// without bind, the method is a loose function with this === undefined
					return (...args: any) => {
						value.call(target[$VALUE], ...args);
						target[$EMIT]();
					};
				case "object":
					target[prop] ??= createStore(value) as any;
					return target[prop];
				default:
					if (target[prop] === undefined) {
						target[prop] = createSignal(value) as any;
						target[prop][$LISTENERS] = [
							(value: any) => {
								(target[$VALUE] as any)[prop] = value;
							},
						];
					}
					return target[prop];
			}
		}
	},

	set(target: any, prop: any, value: any) {
		if (prop === $NODES || prop === $VALUE || prop === $LISTENERS) {
			target[prop] = value;
		} else {
			target[$VALUE][prop] = value;
		}
		target[$EMIT]();
		return true;
	},

	// TODO:
	// set() {}
	// delete() {}
	// defineProperty() {}
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
