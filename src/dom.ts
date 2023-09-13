import attributes from "./attributes";
import { $NODES, $VALUE, Signal, isSignal } from "./signal";

declare global {
	namespace JSX {
		type Element = Node | string;

		interface ElementChildrenAttribute {
			children: {};
		}

		interface IntrinsicElements extends IntrinsicElementsMap {}

		// TODO
		type IntrinsicElementsMap = {
			[K in keyof HTMLElementTagNameMap]: Record<string, any>;
		};

		interface Component {
			(properties?: Record<string, any>, ...children: Node[]): Node;
		}
	}
}

export function jsx(tag: string | JSX.Component, properties: Record<string, any> | null, ...children: Node[]): Node {
	if (typeof tag === "function") {
		return tag(properties ? ((properties.children = children), properties) : { children });
	}

	const element = document.createElement(tag);

	// attributes
	for (const key in properties) {
		const property = properties[key];
		if (isSignal(property)) {
			const attr = document.createAttribute(key);
			attr.nodeValue = property();
			element.setAttributeNode(attr);
			property[$NODES] ??= [];
			property[$NODES].push(attr);
		} else {
			element.setAttribute(key, properties[key]);
		}
	}

	// children
	for (let child of children) {
		if (isSignal(child)) child = signalToNode(child);
		element.append(child);
	}

	return element;
}

interface FragmentProps {
	children: Node[];
}

jsx.Fragments = function ({ children }: FragmentProps): Node {
	const fragment = new DocumentFragment();
	for (let child of children) {
		if (isSignal(child)) child = signalToNode(child);
		fragment.append(child);
	}
	return fragment;
};

function signalToNode(signal: Signal<any>): Node {
	const node = toNode(signal[$VALUE]);
	signal[$NODES] ??= [];
	signal[$NODES].push(node);
	return node;
}

/**
 * Takes any value and converts it to a single usable DOM node.
 *
 * Nodes are kept unchanged.
 * `null` and `undefined` are converted to comments.
 * Other values are coerced to strings and produce a Text node
 */
export function toNode(value: any): Node {
	if (Array.isArray(value)) return new Text(value.join());
	if (value === null || value === undefined) return new Comment();
	if (value instanceof Node) return value;
	return new Text("" + value);
}

/**
 * Tries to update the node with a new value. If it fails, replace the old node in the DOM with a new one.
 * @param node The existing node
 * @param value The new value
 * @returns The node that is in the DOM by the end of the function's execution.
 */
export function updateOrReplaceNode(node: Node, value: any): Node {
	if (value === node) return node;

	// try updating node
	switch (node.nodeType) {
		case Node.ATTRIBUTE_NODE:
			node.nodeValue = value;
			updateOwnerProperty(node as Attr, value);
			return node;
		case Node.TEXT_NODE:
			if (value instanceof Node || value === null || value === undefined) break;
			node.nodeValue = Array.isArray(value) ? value.join("") : "" + value;
			return node;
		case Node.COMMENT_NODE:
			if (value === null || value === undefined) return node;
			break;
	}

	// replace node
	const newNode = toNode(value);
	node.parentNode?.replaceChild(newNode, node);
	return newNode;
}

/**
 * Updates an attribute owner's corresponding property.
 *
 * For example, passing a "value" attribute node will update owner.value
 */
function updateOwnerProperty(attr: Attr, value: any): void {
	const prop = (attributes as any)[attr.nodeName] ?? attr.nodeName;
	if (attr.ownerElement?.hasAttribute(prop)) {
		(attr.ownerElement as any)[prop] = value;
	}
}
