// TODO:
//	- signals in attributes
//		(add comment above element)
//	- return conditionnel ??

// TODO
declare global {
	namespace JSX {
		type Element = Node;

		interface ElementChildrenAttribute {
			children: {};
		}

		interface IntrinsicElements extends IntrinsicElementsMap {}

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

type InDOMElement = HTMLElement | Comment | Text;
type ValidNode = InDOMElement | DocumentFragment;

function isValidNode(value: any): value is ValidNode {
	if (typeof value !== "object") return false;
	if (value instanceof HTMLElement) return true;
	if (value instanceof Comment) return true;
	if (value instanceof Text) return true;
	if (value instanceof DocumentFragment) return true;
	return false;
}

export function jsx(tag: string | JSX.Component, properties: { [key: string]: any }, ...children: Node[]): Node {
	if (tag === jsx.Fragments) {
		return jsx.Fragments(undefined, ...children);
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

// TODO monad-like expression as parameter?
//		(if on array, apply to elements instead of the array)
function signalToJSX(signal: Signal<any>): Node {
	const fragment = document.createDocumentFragment();
	const privates = _privates.get(signal);
	if (!privates) return fragment;

	fragment.append(document.createComment(`${privates.id}-${generateId()}`));
	// TODO: mieux faire expression
	// TODO: factoriser ça avec emit
	const node = isValidNode(signal.value) ? signal.value : document.createTextNode("" + signal.value);
	fragment.append(node);
	if (node instanceof DocumentFragment) {
		privates.elements.push([...node.childNodes] as InDOMElement[]);
	} else {
		privates.elements.push(node);
	}
	return fragment;
}

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
const elementExpressions = new Map<Node, (value: any) => any>();

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

function fragmentToFlatArray(fragment: DocumentFragment): Node[] {
	const array: Node[] = [];
	(function convert(fragment: DocumentFragment) {
		for (const child of fragment.children) {
			if (child instanceof DocumentFragment) {
				convert(child);
			} else {
				array.push(child);
			}
		}
	})(fragment);
	return array;
}

// TODO: mutate instead of replacing
function _emit(source: Signal<any>) {
	const privates = _privates.get(source);
	if (!privates) return;

	const { value } = privates;
	for (let i = 0; i < privates.elements.length; i++) {
		let element = privates.elements[i];
		if (Array.isArray(element)) {
			let tmp = element.pop();
			if (tmp === undefined) return;
			// TODO en profiter pour faire le cleanup ?
			for (const child of element) child.remove();
			element = tmp;
		}

		// TODO attribute values

		let node: ValidNode = isValidNode(value) ? value : document.createTextNode("" + value);
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

// TODO: garbage collection

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

/*************
 *   TESTS   *
 *************/

function CommentElement() {
	return document.createComment("");
}

type ShowProps = {
	if: Signal<any>;
	children: JSX.Element | JSX.Element[];
	fallback?: JSX.Element;
};

function Show(props: ShowProps) {
	return (
		<>
			{deriveSignal(() => {
				if (!props.if.value) return <CommentElement />;
				if (!Array.isArray(props.children)) return props.children;
				return <>{...props.children}</>;
			}, [props.if])}
		</>
	);
}

// TODO: typer les signaux
type ForProps = {
	each: Signal<any>; // TODO: valeur non-signal ?
	children: (signal: Signal<any>) => Node[];
};

function For() {}

function Counter() {
	const count = createSignal(0);
	const increment = () => count.value++;
	return <button onClick={increment}>{count}</button>;
}

function MaxCounter() {
	const count = createSignal(0);
	const isHigh = deriveSignal(() => count.value > 9, [count]);
	const increment = () => count.value++;
	return <button onClick={increment}>{count}</button>;
}

function Input() {
	const input = createSignal("");
	return <input bind={input} />;
}

const bool = createSignal(false);

document.body.append(
	<>
		{/* <MaxCounter />
		<Input /> */}
		<button onClick={() => (bool.value = !bool.value)}>Toggle</button>
		<Show if={bool}>
			<div>AA</div>
		</Show>
	</>
);
