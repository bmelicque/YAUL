import { NodeList, toNode, updateDOM } from "./dom";

// TODO:
//	- signals in attributes
//		(add comment above element)
//	- css? tailwind?

/***************
 *   SIGNALS   *
 ***************/

type SignalPrivates<Type> = {
	id: string;
	expression?: () => Type;
	value: Type;
	dependencies?: Signal<any>[];
	listeners: Signal<any>[];
	nodes: (Node | NodeList)[];
};

const _signals = new Map<string, Signal<any>>();
export const _privates = new WeakMap<Signal<any>, SignalPrivates<any>>();
const _elements = new Map<string, Text | HTMLElement>();

export function createSignal<Type>(init: Type): Signal<Type> {
	const signal = new Signal<Type>();
	const id = generateId();
	_signals.set(id, signal);
	_privates.set(signal, {
		id,
		value: init,
		listeners: [],
		nodes: [],
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
		nodes: [],
	});
	for (const dependency of dependencies) {
		_privates.get(dependency)?.listeners.push(signal);
	}
	return signal;
}

export class Signal<Type> {
	get value(): Type {
		return _privates.get(this)?.value;
	}

	set value(value: Type) {
		const privates = _privates.get(this);
		if (privates) privates.value = value;
		_emit(this);
	}
}

function _emit(source: Signal<any>) {
	const privates = _privates.get(source);
	if (!privates) return;

	for (let i = 0; i < privates.nodes.length; i++) {
		privates.nodes[i] = updateDOM(privates.nodes[i], source.value);
	}
	for (const listener of privates.listeners) {
		listener.value = _privates.get(listener)?.expression?.();
	}
}

export const generateId = (() => {
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
	const elements = _privates.get(signal)?.nodes;
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
	if (!privates || privates.nodes.length || privates.listeners.length) return;

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
