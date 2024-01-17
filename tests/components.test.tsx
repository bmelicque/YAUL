import { jsx } from "../src/dom";
import { createSignal } from "../src/signal";
import { For, Show } from "../src/components";
import { createStore } from "../src/store";

describe("<Show />", () => {
	it("should act as an if-else in the DOM", () => {
		const condition = createSignal(true);
		const div = (
			<div>
				<Show when={condition}>
					<p>Content</p>
				</Show>
			</div>
		) as HTMLElement;
		expect(div.children[0].nodeName).toBe("P");
		condition.set(false);
		expect(div.children.length).toBe(0);
	});
});

describe("<For />", () => {
	it("chould act as a map in the DOM", () => {
		const array = createStore([0, 1, 2]);
		const div = (
			<div>
				<For of={array}>{(value) => <div>{value}</div>}</For>
			</div>
		) as HTMLElement;
		expect(div.children.length).toBe(3);
		expect(div.children[0].textContent).toBe("0");
		array.set([1, 2]);
		expect(div.children.length).toBe(2);
		expect(div.children[0].textContent).toBe("1");
	});
});
