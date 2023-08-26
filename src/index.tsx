import { $NODES, createSignal } from "./signal-new";
import { jsx } from "./dom-new";

const x = createSignal(1);

setInterval(() => {
	x.set((value) => value + 1);
}, 1000);

document.body.append(
	<div id={x} class="class">
		{x}
	</div>
);

console.log(x[$NODES]);
