import attributes from "./attributes";
import { $DETACH_NODE, $NODES, $VALUE, Signal, isSignal } from "./signal";

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

const nodeMap = new Map<Node, Signal<any>>();

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
			nodeMap.set(attr, property);
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
	nodeMap.set(node, signal);
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

/**
 * Clean up signals when they disappear from the DOM
 */
new MutationObserver(function (mutations) {
	for (const mutation of mutations) {
		for (const removedNode of mutation.removedNodes) {
			parseTree(removedNode);
		}
	}
}).observe(document.body, { attributes: true, childList: true, characterData: true, subtree: true });

function parseTree(node: Node) {
	const nodeIterator = document.createNodeIterator(node);
	let currentNode;
	while ((currentNode = nodeIterator.nextNode())) {
		nodeMap.get(currentNode)?.[$DETACH_NODE](currentNode);
		if (currentNode instanceof HTMLElement) {
			for (const attribute of currentNode.attributes) {
				nodeMap.get(attribute)?.[$DETACH_NODE](currentNode);
			}
		}
	}
}
