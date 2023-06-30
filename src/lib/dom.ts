export type InDOMElement = HTMLElement | Comment | Text;
export type ValidNode = InDOMElement | DocumentFragment;

/**
 * A non-empty list of consecutive nodes
 */
export type NodeList = [Node, ...Node[]];

export function isValidNode(value: any): value is ValidNode {
	if (typeof value !== "object") return false;
	if (value instanceof HTMLElement) return true;
	if (value instanceof Comment) return true;
	if (value instanceof Text) return true;
	if (value instanceof DocumentFragment) return true;
	return false;
}

export function valueToNode(value: any): ValidNode {
	if (!Array.isArray(value)) {
		return isValidNode(value) ? value : document.createTextNode("" + value);
	}

	if (!value.length) {
		return document.createComment("");
	}

	const node = document.createDocumentFragment();
	for (const el of value) {
		node.append(isValidNode(el) ? el : document.createTextNode("" + el));
	}
	return node;
}

/**
 * Takes any value and converts it to a single usable DOM node or an array of nodes.
 *
 * Array are converted to an array of nodes. Empty arrays and null values are converted
 * to an empty Comment. Primitives are converted to a Text node.
 *
 * @throws If the value is an object that is neither an array or a DOM node
 */
export function toNode(value: any): Node | NodeList {
	if (Array.isArray(value)) {
		const res: Node[] = [];
		for (const el of value) {
			const node = toNode(el);
			if (Array.isArray(node)) {
				res.push(...node);
			} else {
				res.push(node);
			}
		}
		return res.length ? (res as NodeList) : document.createComment("");
	}

	if (value === null) {
		return document.createComment("");
	}

	if (value instanceof Node) {
		return value;
	}

	// TODO what about functions ?

	if (typeof value === "object") {
		throw new Error("Objects are not valid elements.");
	}

	return new Text("" + value);
}

function updateDOM(target: Node | NodeList, value: any) {
	if (Array.isArray(target)) {
		updateMany(target, value);
	} else {
		updateOne(target, value);
	}
}

/**
 * Updates a list of DOM nodes with new values. If it cannot update a given node, it
 * will replace it instead.
 *
 * @throws If the value is an object that is neither an array or a DOM node
 *
 * @returns If the node's value as updated, returns nothing. If it was replaced,
 * returns the new node(s).
 */
function updateMany(nodes: NodeList, value: any): Node | Node[] | undefined {
	if (nodes === value) return;
	if (!Array.isArray(value)) {
		const first = nodes.shift()!;
		const parent = first.parentNode;
		if (!parent) return;
		for (const node of nodes) {
			parent.removeChild(node);
		}
		return replaceNode(toNode(value), first);
	}

	const min = Math.min(value.length, nodes.length);
	const res: Node[] = [];
	for (let i = 0; i < min; i++) {
		const updated = updateOne(nodes[i], value[i]);
		if (Array.isArray(updated)) {
			// TODO shouldn't happen?
			res.push(...updated);
		} else {
			res.push(updated ?? nodes[i]);
		}
	}
	for (let i = min; i < nodes.length; i++) {
		nodes[i].parentNode?.removeChild(nodes[i]);
	}
	for (let i = min; i < value.length; i++) {
		const node = toNode(value);
		insertAfter(node, res[res.length - 1]);
		if (Array.isArray(node)) {
			// TODO shouldn't happen?
			res.push(...node);
		} else {
			res.push(node);
		}
	}
	return res as NodeList;
}

/**
 * Updates a node in the DOM with a new value. If the value and node types are not
 * compatible, replaces the old node with a new one created from the value.
 *
 * @throws If the value is an object that is neither an array or a DOM node
 *
 * @returns If the node's value as updated, returns nothing. If it was replaced,
 * returns the new node(s).
 */
function updateOne(node: Node, value: any): Node | Node[] | undefined {
	if (value === node) return;
	if (Array.isArray(value)) {
		return replaceNode(toNode(value), node);
	}
	switch (node.nodeType) {
		case Node.ATTRIBUTE_NODE:
			node.nodeValue = value;
			return;
		case Node.TEXT_NODE:
			if (typeof value !== "object") {
				node.nodeValue = value;
				return;
			}
			return replaceNode(toNode(value), node);
		case Node.COMMENT_NODE:
			if (value === null) return;
			return replaceNode(toNode(value), node);
		default:
			// default also handles node values
			return replaceNode(toNode(value), node);
	}
}

// TODO: make sure there's always at least one
function replaceNode(node: Node, old: Node): Node;
function replaceNode(node: Node[], old: Node): Node[];
function replaceNode(node: NodeList, old: Node): NodeList;
function replaceNode(node: Node | Node[], old: Node): Node | Node[];
function replaceNode(node: Node | Node[], old: Node): Node | Node[] {
	if (!Array.isArray(node)) {
		old.parentNode?.replaceChild(node, old);
		return node;
	}
	if (!node.length) return node;
	const last = node.pop()!;
	old.parentNode?.replaceChild(last, old);
	for (const child of node) {
		old.parentNode?.insertBefore(child, last);
	}
	node.push(last);
	return node;
}

function insertBefore(node: Node | NodeList, target: Node) {
	if (!Array.isArray(node)) return target.parentNode?.insertBefore(node, target);
	for (const child of node) {
		target.parentNode?.insertBefore(child, target);
	}
}

function insertAfter(node: Node | NodeList, target: Node) {
	if (!Array.isArray(node)) return target.parentNode?.insertBefore(node, target.nextSibling);
	const next = target.nextSibling;
	for (const child of node) {
		target.parentNode?.insertBefore(child, next);
	}
}

class Flattener {
	array: Node[] = [];

	flatten(fragment: DocumentFragment) {
		for (const child of fragment.children) {
			if (child instanceof DocumentFragment) {
				this.flatten(child);
			} else {
				this.array.push(child);
			}
		}
		return this.array;
	}
}

export function fragmentToFlatArray(fragment: DocumentFragment) {
	return new Flattener().flatten(fragment);
}
