import { jsx } from "./dom";
import { createStore } from "./store";

export { jsx } from "./dom";
export { createSignal } from "./signal";
export { createComputed } from "./computed";
export { createStore } from "./store";
export { Show } from "./components";

const l = createStore([0, 1, 2]);
console.log("before push:", l());
l.push(3);
console.log("after push:", l());

l.length.set(10);

// setInterval(() => {
// 	l.push(l().length); // FIXME
// 	console.log(l());
// }, 1000);

document.body.append(<div>{l}</div>);
