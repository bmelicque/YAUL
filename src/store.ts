import { $EMIT, $VALUE, Signal, createSignal, signalPrototype } from "./signal";

type Store<Type extends object> = Signal<Type> & {
	[Prop in keyof Type]: Type[Prop] extends object ? Store<Type[Prop]> : Signal<Type[Prop]>;
} & {
	[$TARGET]: Store<Type>;
};

const $TARGET = Symbol();

const storePrototype = {
	set<Type extends object>(this: Store<Type>, value: Type | ((_: Type) => Type)): boolean {
		value = typeof value === "function" ? value(this[$VALUE]) : value;
		let hasChanged = false;
		for (const key in this[$VALUE]) {
			// TODO: clean up signal
			if (!(key in value)) delete this[$VALUE][key];
		}
		for (const key in value) {
			// all keys might not have been created
			// use of $TARGET to get the prop on the target object, else it would get the key in $VALUE and create a signal
			if (this[$TARGET].hasOwnProperty(key)) hasChanged ||= this[key].set(value[key]);
		}
		this[$VALUE] = value;
		if (hasChanged) this[$EMIT]();
		return hasChanged;
	},
};
Object.setPrototypeOf(storePrototype, signalPrototype);

const handler = {
	get<Type extends object>(target: Store<Type>, prop: keyof Store<Type>, proxy: any /* TODO */) {
		if (prop === $TARGET) return target;
		if (prop === "set" || prop === $EMIT) return target[prop].bind(proxy);
		if (target.hasOwnProperty(prop)) return target[prop];
		if (prop in target[$VALUE]) {
			const value = (target[$VALUE] as any)[prop];
			switch (typeof value) {
				case "function":
					// without bind, the method is a loose function with this === undefined
					return value.bind(target[$VALUE]);
				case "object":
					target[prop] ??= createStore(value) as any;
					return target[prop];
				default:
					target[prop] ??= createSignal(value) as any;
					return target[prop];
			}
		}
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
