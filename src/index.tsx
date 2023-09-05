import { $LISTENERS, $NODES, createSignal } from "./signal-new";
import { jsx } from "./dom-new";
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
