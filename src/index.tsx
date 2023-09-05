import { createSignal } from "./signal";
import { jsx } from "./dom";
import { createComputed } from "./computed";

const x = createSignal(1);

const y = createComputed(() => 2 * x());

setInterval(() => {
	x.set((value) => value + 1);
}, 1000);

document.body.append(
	<div id={x} class="class">
		Signal is: {x} <br />
		Double value is: {y}
	</div>
);
