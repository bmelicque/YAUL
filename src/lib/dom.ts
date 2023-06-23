export type InDOMElement = HTMLElement | Comment | Text;
export type ValidNode = InDOMElement | DocumentFragment;

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
