/**
 * Creates a context that can be accessed by functions run within it.
 *
 * Context is created with a reaction function that will be called on consumption.
 * Create a context, then run a function with ``.run(fn, contextElement)``.
 * Functions called from `run` can use `.consume(value)` to trigger the reaction.
 * This reaction has access to the context and the provided value.
 */
export class Context<ContextType, UseType> {
	private stack: ContextType[] = [];

	constructor(private cb: (contextElement: ContextType, value: UseType) => void) {}

	/**
	 * Runs a function with the given context.
	 * @param fn The function to run
	 * @param contextElement The piece of context to use
	 * @returns The value returned by the function
	 */
	run<ReturnType>(fn: () => ReturnType, contextElement: ContextType): ReturnType {
		this.stack.push(contextElement);
		const value = fn();
		this.stack.pop();
		return value;
	}

	/**
	 * Consumes the context with the given value
	 * @param value Any value matching the type provided in the reaction
	 */
	consume(value: UseType) {
		if (this.stack.length) {
			this.cb(this.stack[this.stack.length - 1], value);
		}
	}
}
