# What's Yaul?

**Yaul** (standing for _Yet Another UI Library_, or _Why Another UI Library?_) is, as its name implies, a frontend framework/library.

It's designed as a lightweight, TypeScript-first, and easy-to-learn. It's not production ready though (and will probably never be...).

# Motivation

This is basically an exercize for me as a junior dev. It will probably not be maintained.

A few things I've learned:

- Extending functions
- Complex DOM manipulations
- Symbols as object keys (did you know they were non-enumerable by default? it took me weeks to figure it out!)
- Proxies are tricky
- "Best practices" sometimes make things much harder, and the gain's not that great with only ~600 LoC

# A basic component

```jsx
import { createComputed, createSignal, jsx } from "yaul";

function Counter() {
	const count = createSignal(0);
	const doubleCount = createComputed(() => count() * 2);

	console.log("This runs only once");

	return (
		<>
			<button onclick={() => count.set((val) => val + 1)}>+ 1</button>
			<p>
				{doubleCount} is the double of {count}
			</p>
		</>
	);
}
```

Yaul uses functions and JSX to create components. Contrary to React, functions are constructors that are only run once. Yaul uses no virtual DOM and uses signals to update the real DOM.

# Signals, Computed & Stores

Simple reactive values may be created with `createSignal`. They may be used as-is in JSX:

```jsx
const count = createSignal(0);
return <div>{count}</div>;
```

Signals are unwrapped by being called:

```js
const signal = createSignal("hi!"); // signal is reactive
const value = signal(); // value is not
```

You can set a new value with the `set` method:

```js
const count = createSignal(0);
count.set(1); // count's value is now 1;
count.set((current) => current + 1); // count's value is now 2;
```

Computed values are created with `createComputed`. It will detect any unwrapping in its constructor to know which signals to listen to.

```js
const a = createSignal(1);
const b = createSignal(2);
const sum = createComputed(() => a() + b()); // sum will listen to a and b changes
```

More complex values may be created with `createStore`, which will lazily create sub-signals when needed.

```js
const user = createStore({
	name: "John",
	age: "42",
});
const plainName = user().name; // not reactive
const reactiveName = user.name; // reactiveName is a signal
```

# Built-in components

Yaul provides a couple built-in components, `<Show />` and `<For />`

```jsx
const show = createSignal(true);
return (
	<>
		<button onClick={() => show.set((current) => !current)}>Toggle</button>
		<Show when={show}>
			<p>This is a paragraph</p>
		</Show>
	</>
);
```

```jsx
const fruits = createStore(["apple", "banana", "orange"]);
return (
	<For of={fruits}>
		{(fruit, index) => (
			<div>
				Fruit #{index}: {fruit}
			</div>
		)}
	</For>
);
```
