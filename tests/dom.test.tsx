import { jsx } from "../src/dom";
import { createSignal } from "../src/signal";

describe("JSX", () => {
	it("should render HTML tags", () => {
		const div = (<div id="test-div">Inner Text</div>) as HTMLDivElement;
		expect(div.nodeName).toBe("DIV");
		expect(div.id).toBe("test-div");
		expect(div.textContent).toBe("Inner Text");
	});

	it("should render components", () => {
		function CustomLink() {
			return (<a href="#">Custom Link</a>) as HTMLAnchorElement;
		}
		const link = (<CustomLink />) as HTMLAnchorElement;
		expect(link.nodeName).toBe("A");
	});

	it("should render fragments", () => {
		const fragments = (
			<>
				<h1>Title</h1>
				<p>Paragraph</p>
			</>
		) as DocumentFragment;
		expect(fragments.nodeName).toBe("#document-fragment");
		expect(fragments.children[0].nodeName).toBe("H1");
		expect(fragments.children[1].nodeName).toBe("P");
	});

	it("should listen to signal changes", () => {
		const s = createSignal(0);
		const div = (<div>{s}</div>) as HTMLDivElement;
		expect(div.textContent).toBe("0");
		s.set(42);
		expect(div.textContent).toBe("42");
	});
});
