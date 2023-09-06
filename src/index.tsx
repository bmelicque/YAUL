import { createSignal } from "./signal";
import { jsx } from "./dom";
import { createComputed } from "./computed";
import { createStore } from "./store";
import { Show } from "./components";

const x = createSignal(1);
const y = createComputed(() => 2 * x());

const s = createStore({ counter: 1 });
const t = createComputed(() => 2 * s.counter());

const b = createSignal(true);

setInterval(() => {
	x.set((value) => value + 1);
	s.counter.set((value) => value + 1);
	b.set((value) => !value);
}, 1000);

document.body.append(
	<section>
		<div id={x} class="class">
			<h2>Signals & Computed</h2>
			Signal is: {x} <br />
			Double value is: {y}
		</div>
		<div>
			<h2>Stores</h2>
			Counter is: {s.counter} <br />
			Double counter is: {t}
		</div>
		<Show when={b} fallback="Fallback">
			Some content
		</Show>
	</section>
);
