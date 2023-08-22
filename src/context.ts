import { $ADD_LISTENER, $DEPENDENCIES, $UPDATER, Computed, Signal } from "./signal";

type ContextElement = Computed<any> | (() => void);

const contextStack: ContextElement[] = [];

/**
 * Runs a function. If its body contains access to reactive values, the given context
 * element will subsribe to those values' changes. For example, in:
 * ```
 * runWith(computedSignal, () => (signal.value))
 * ```
 * `computedSignal` will subscribe to `signal`.
 * @param context a ContextElement that may subscribe to reactive values.
 * @param fn a function whose body contains access to reactive values.
 * @returns the result of the argument function
 */
export function runWith<Type>(context: ContextElement, fn: () => Type): Type {
	contextStack.push(context);
	const result = fn();
	contextStack.pop();
	return result;
}

export function listenContext(signal: Signal<any>) {
	if (contextStack.length === 0) return;
	const contextElement = contextStack[contextStack.length - 1];
	if (contextElement instanceof Computed) {
		signal[$ADD_LISTENER](contextElement[$UPDATER]);
		contextElement[$DEPENDENCIES].push(signal);
	} else if (contextElement instanceof Function) {
		signal[$ADD_LISTENER](contextElement);
	}
}
