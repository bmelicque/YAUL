import { InDOMElement, fragmentToFlatArray, valueToNode } from "./lib/dom";

// TODO:
//	- signals in attributes
//		(add comment above element)
//	- css? tailwind?

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

export function jsx(tag: string | JSX.Component, properties: { [key: string]: any }, ...children: Node[]): Node {
	if (tag === jsx.Fragments) {
		return jsx.Fragments(null, ...children);
	}
	if (typeof tag === "function") {
		return tag(Object.assign(properties ?? {}, { children }));
	}
	const element = document.createElement(tag);
	for (let child of children) {
		if (child instanceof Signal) child = signalToJSX(child);
		element.append(child);
	}
	if (!properties) return element;

	if (properties.bind instanceof Signal) {
		bind(element, properties.bind);
		delete properties.bind;
	}
	for (const key in properties) {
		if (key.startsWith("on")) {
			element.addEventListener(key.slice(2).toLowerCase(), properties[key]);
		} else {
			element.setAttribute(key, "" + properties[key]);
		}
	}
	return element;
}

jsx.Fragments = function (_: any, ...children: Node[]): Node {
	const fragment = new DocumentFragment();
	for (let child of children) {
		if (child instanceof Signal) child = signalToJSX(child);
		fragment.append(child);
	}
	return fragment;
};

function signalToJSX(signal: Signal<any>): Node {
	const fragment = document.createDocumentFragment();
	const privates = _privates.get(signal);
	if (!privates) return fragment;

	fragment.append(document.createComment(`${privates.id}-${generateId()}`));
	// TODO: mieux faire expression
	// TODO: factoriser ça avec emit
	const node = valueToNode(signal.value);
	if (node instanceof DocumentFragment) {
		privates.elements.push(fragmentToFlatArray(node) as InDOMElement[]);
	} else {
		privates.elements.push(node);
	}
	fragment.append(node); // this empties node if it is a DocumentFragment
	return fragment;
}

// TODO do I want this?
//	Maybe: <Input />, <TextArea />, <Button />...
function bind(element: HTMLElement, signal: Signal<any>): Node {
	const node = document.createDocumentFragment();
	const privates = _privates.get(signal);
	if (!privates) return node;

	node.append(document.createComment(`${privates.id}-${generateId()}`));
	element.innerText = privates.value;
	// TODO: mettre le bon type d'évènement
	element.addEventListener("input", (e) => (signal.value = (e.currentTarget as any)?.value));
	privates.elements.push(element);
	node.append(element);
	return node;
}

/***************
 *   SIGNALS   *
 ***************/

type SignalPrivates<Type> = {
	id: string;
	expression?: () => Type;
	value: Type;
	dependencies?: Signal<any>[];
	listeners: Signal<any>[];
	elements: (InDOMElement | InDOMElement[])[]; // Y inclure Element[] pour les fragments
	elementExpressions?: Map<HTMLElement, (value: any) => any>; // TODO
};

const _signals = new Map<string, Signal<any>>();
const _privates = new WeakMap<Signal<any>, SignalPrivates<any>>();
const _elements = new Map<string, Text | HTMLElement>();

export function createSignal<Type>(init: Type): Signal<Type> {
	const signal = new Signal<Type>();
	const id = generateId();
	_signals.set(id, signal);
	_privates.set(signal, {
		id,
		value: init,
		listeners: [],
		elements: [],
	});
	return signal;
}

export function deriveSignal<Type>(expression: () => Type, dependencies: Signal<any>[]): Signal<Type> {
	const signal = new Signal<Type>();
	const id = generateId();
	_signals.set(id, signal);
	_privates.set(signal, {
		id,
		expression,
		value: expression(),
		dependencies,
		listeners: [],
		elements: [],
	});
	for (const dependency of dependencies) {
		_privates.get(dependency)?.listeners.push(signal);
	}
	return signal;
}

class Signal<Type> {
	get value(): Type {
		return _privates.get(this)?.value;
	}

	set value(value: Type) {
		if (_privates.get(this)) {
			_privates.get(this)!.value = value;
		}
		_emit(this);
	}
}

// TODO: mutate instead of replacing
function _emit(source: Signal<any>) {
	const privates = _privates.get(source);
	if (!privates) return;

	for (let i = 0; i < privates.elements.length; i++) {
		let element = privates.elements[i];
		if (Array.isArray(element)) {
			let tmp = element.pop();
			if (tmp === undefined) return;
			for (const child of element) {
				removeRecursively(child);
				child.remove();
			}
			element = tmp;
		}

		// TODO attribute values

		const node = valueToNode(source.value);
		if (node instanceof DocumentFragment) {
			privates.elements[i] = fragmentToFlatArray(node) as InDOMElement[];
		} else {
			privates.elements[i] = node;
		}
		// TODO en profiter pour faire le cleanup
		element.replaceWith(node); // this empties DocumentFragments
	}
	for (const listener of privates.listeners) {
		listener.value = _privates.get(listener)?.expression?.();
	}
}

const generateId = (() => {
	let _ = 0;
	return () => "" + _++;
})();

/*******************************
 *   DEPENDENCY TREE CONTROL   *
 *******************************/

// TODO supprimer de façon asynchrone
//      (Pour éviter par exemple de bloquer le render d'une page en supprimant l'ancienne)
function removeRecursively(node: Node) {
	for (const childNode of node.childNodes) {
		removeRecursively(childNode);
	}
	if (node.nodeName === "#comment") {
		const res = node.nodeValue?.trim().match(/^s-(\d+-\d+)$/);
		if (!res) return;
		return removeElement(res[1]);
	}
}

function removeElement(id: string) {
	const element = _elements.get(id);
	if (!element) return;

	const signalId = id.split("-")[0];
	const signal = _signals.get(signalId);
	if (!signal) return;
	const elements = _privates.get(signal)?.elements;
	if (!elements) return;
	for (let i = 0; i < elements.length; i++) {
		if (elements[i] === element) {
			elements.splice(i, 1);
			break;
		}
	}
	_enforceLifeTime(signal);
}

function _enforceLifeTime(signal: Signal<any>) {
	const privates = _privates.get(signal);
	if (!privates || privates.elements.length || privates.listeners.length) return;

	_signals.delete(privates.id);
	if (!privates.dependencies) return;
	for (const dependency of privates.dependencies) {
		_removeListener(dependency, signal);
	}
}

function _removeListener(source: Signal<any>, listener: Signal<any>) {
	const listeners = _privates.get(source)?.listeners;
	if (!listeners) return;
	for (let i = 0; i < listeners.length; i++) {
		if (listeners[i] === listener) {
			listeners.splice(i, 1);
			break;
		}
	}
	_enforceLifeTime(source);
}
