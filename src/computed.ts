import { Context } from "./context";
import { $LISTENERS, $VALUE, Signal, createSignal } from "./signal";

interface Computed<Type> extends Signal<Type> {
	[$DEPENDENCIES]: Signal<any>[];
	[$UPDATER]: () => void;
}

export const $DEPENDENCIES = Symbol("dependencies");
export const $UPDATER = Symbol("updater");

export const creationContext = new Context((context: Computed<any>, value: Signal<any>) => {
	context[$DEPENDENCIES].push(value);
	value[$LISTENERS] ??= [];
	value[$LISTENERS].push(context[$UPDATER]);
});

export function createComputed<Type>(expr: () => Type): Computed<Type> {
	const computed = createSignal<Type>(undefined as any) as Computed<Type>;
	computed[$DEPENDENCIES] = [];
	computed[$UPDATER] = () => computed.set(expr());
	computed[$VALUE] = creationContext.run(expr, computed);
	return computed;
}
