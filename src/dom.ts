import { $ID, $NODES, Signal, cleanup, generateId, isSignal, owners } from "./signal";

/**
 * A non-empty list of consecutive nodes
 */
export type NodeList = [Node, ...Node[]];

declare global {
	namespace JSX {
		type Element = Node;

		interface ElementChildrenAttribute {
			children: {};
		}

		interface IntrinsicElements extends IntrinsicElementsMap {}

		// TODO
		type IntrinsicElementsMap = {
			[K in keyof HTMLElementTagNameMap]: {
				[k: string]: any;
			};
		};

		interface Component {
			(properties?: { [key: string]: any }, ...children: Node[]): Node;
		}
	}
}

export const attributeToProperty: { [key: string]: string } = {};

export const stack: number[] = [];
export function getOwner() {
	return stack[stack.length - 1];
}

export function jsx(tag: string | JSX.Component, properties: { [key: string]: any }, ...children: Node[]): Node {
	const id = generateId();
	stack.push(id);
	let el = _jsx(tag, properties, ...children);
	if (owners.get(id)) {
		if (!(el instanceof DocumentFragment)) {
			const tmp = new DocumentFragment();
			tmp.append(el);
			el = tmp;
		}
		(el as DocumentFragment).append(new Comment(`y-stack=${id}`));
	}
	stack.pop();
	return el;
}

function _jsx(tag: string | JSX.Component, properties: { [key: string]: any }, ...children: Node[]): Node {
	if (typeof tag === "function") {
		return tag(Object.assign(properties ?? {}, { children }));
	}
	const element = document.createElement(tag);
	for (let child of children) {
		if (isSignal(child)) child = signalToJSX(child);
		element.append(child);
	}
	if (!properties) return element;

	const fragment = new DocumentFragment();
	const ids: number[] = [];
	for (const key in properties) {
		const value = properties[key];
		if (key.startsWith("on")) {
			element.addEventListener(key.slice(2).toLowerCase(), value);
		} else if (isSignal(value)) {
			ids.push(value[$ID]);
			const attribute = document.createAttribute(key);
			attribute.nodeValue = value.value;
			attributeToProperty[attribute.nodeName] = key;
			element.setAttributeNode(attribute);
			value[$NODES].push(attribute);
		} else {
			element.setAttribute(key, "" + value);
		}
	}
	if (ids.length) {
		fragment.append(new Comment(`y-signal=${ids.join("-")}`));
	}
	fragment.append(element);
	return fragment;
}

jsx.Fragments = function ({ children }: { children: Node[] }): Node {
	const fragment = new DocumentFragment();
	for (let child of children) {
		if (isSignal(child)) child = signalToJSX(child);
		fragment.append(child);
	}
	return fragment;
};

function signalToJSX(signal: Signal<any>): Node {
	const fragment = new DocumentFragment();
	fragment.append(new Comment(`y-signal=${signal[$ID]}`));
	const node = toNode(signal.value);

	signal[$NODES].push(node);
	fragment.append(node);
	return fragment;
}

/**
 * Takes any value and converts it to a single usable DOM node or an array of nodes.
 *
 * Array are converted to an array of nodes. Empty arrays and null values are converted
 * to an empty Comment. Primitives are converted to a Text node.
 *
 * @throws If the value is an object that is neither an array or a DOM node
 */
export function toNode(value: any): Node {
	if (Array.isArray(value)) {
		return new Text(value.join());
	}

	if (value === null) {
		return new Comment("");
	}

	if (value instanceof Node) {
		return value;
	}

	if (typeof value === "object" || typeof value === "function") {
		throw new Error("Non-primitive signals are not valid as JSX children");
	}

	return new Text("" + value);
}

/**
 * Updates a node in the DOM with a new value. If the value and node types are not
 * compatible, replaces the old node with a new one created from the value.
 *
 * @throws If the value is an object that is neither an array or a DOM node
 *
 * @returns The updated node
 */
export function updateNode(node: Node, value: any): Node {
	if (value === node) return node;
	switch (node.nodeType) {
		case Node.ATTRIBUTE_NODE:
			node.nodeValue = value;
			updateOwnerProperty(node as Attr, value);
			return node;
		case Node.TEXT_NODE:
			if (Array.isArray(value)) {
				node.nodeValue = value.join();
				return node;
			} else if (typeof value !== "object") {
				node.nodeValue = value;
				return node;
			}
			return replaceNode(toNode(value), node);
		case Node.COMMENT_NODE:
			if (value === null) return node;
			return replaceNode(toNode(value), node);
		default:
			// default also handles node values
			return replaceNode(toNode(value), node);
	}
}

/**
 * Updates an attribute owner's corresponding property.
 *
 * For example, passing a "value" attribute node will update owner.value
 */
function updateOwnerProperty(attr: Attr, value: any): void {
	const owner = attr.ownerElement;
	if (!owner) return;
	const prop = attributeToProperty[attr.nodeName];
	if (owner.hasAttribute(prop)) {
		(owner as any)[prop] = value;
	}
}

/**
 * Removes a node from the DOM and replaces it with a single node or a list of at least
 * one node.
 *
 * @returns The inserted node(s).
 */
export function replaceNode(node: Node, old: Node): Node {
	old.parentNode?.replaceChild(node, old);
	cleanup(old);
	return node;
}

/**
 * Gets elements from a DocumentFragment and puts them into an array. Fragments are flattened.
 */
export function fragmentsToFlatArray(node: Node): Node[] {
	if (!(node instanceof DocumentFragment)) {
		return [node];
	}

	const array: Node[] = [];
	for (const child of node.childNodes) {
		for (const subnode of fragmentsToFlatArray(child)) {
			array.push(node);
		}
	}
	return array;
}
