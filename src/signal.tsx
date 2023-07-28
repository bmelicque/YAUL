import { ComponentHandler } from "./components";
import { stack, updateNode } from "./dom";

// TODO:
//	- css? tailwind?

/***************
 *   SIGNALS   *
 ***************/

type SignalPrivates<Type> = {
	id: string;
	expression?: () => Type;
	value: Type;
	dependencies?: Signal<any>[];
	derivedSignals: Signal<any>[];
	componentHandlers?: ComponentHandler[];
	nodes: Node[];
	owner: string | undefined;
};

const _signals = new Map<string, Signal<any>>();
export const _privates = new WeakMap<Signal<any>, SignalPrivates<any>>();
export const owners = new Map<string, Signal<any>[]>();

export function createSignal<Type>(init: Type): Signal<Type> {
	const signal = new Signal<Type>();
	const id = generateId();
	_signals.set(id, signal);
	_privates.set(signal, {
		id,
		value: init,
		derivedSignals: [],
		nodes: [],
		owner: stack[0],
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
		derivedSignals: [],
		nodes: [],
		owner: stack[0],
	});
	for (const dependency of dependencies) {
		_privates.get(dependency)?.derivedSignals.push(signal);
	}
	return signal;
}

export class Signal<Type> {
	constructor() {
		if (stack[0] !== undefined) {
			if (!owners.has(stack[0])) owners.set(stack[0], [this]);
			else owners.get(stack[0])?.push(this);
		}
	}

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
		privates.nodes[i] = updateNode(privates.nodes[i], source.value);
	}
	for (const derivedSignal of privates.derivedSignals) {
		derivedSignal.value = _privates.get(derivedSignal)?.expression?.();
	}
	if (privates.componentHandlers) {
		for (const handler of privates.componentHandlers) {
			handler.handle(source.value);
		}
	}
}

export const generateId = (
	(_: number) => () =>
		"" + _++
)(0);

/********************************
 *   CLEAN UP DEPENDENCY TREE   *
 ********************************/

// TODO supprimer de façon asynchrone
//      (Pour éviter par exemple de bloquer le render d'une page en supprimant l'ancienne)
export function cleanup(node: Node) {
	for (const childNode of node.childNodes) {
		cleanup(childNode);
	}
	if (node.nodeName === "#comment") {
		const res = node.nodeValue?.trim().match(/^s-(\d+-\d+)$/);
		if (!res) return;
		return removeElement(res[1]);
	}
}

function removeElement(id: string) {
	const [signalId, elementIndex] = id.split("-");
	const signal = _signals.get(signalId);
	if (!signal) return;
	let index = parseInt(elementIndex);
	if (Number.isNaN(index)) return;
	_privates.get(signal)?.nodes.splice(index, 1);
	_enforceLifeTime(signal);
}

function _enforceLifeTime(signal: Signal<any>) {
	const privates = _privates.get(signal);
	if (!privates || privates.nodes.length || privates.derivedSignals.length) return;

	_signals.delete(privates.id);
	if (!privates.dependencies) return;
	for (const dependency of privates.dependencies) {
		_removeListener(dependency, signal);
	}
}

function _removeListener(source: Signal<any>, listener: Signal<any>) {
	const listeners = _privates.get(source)?.derivedSignals;
	if (!listeners) return;
	const i = listeners.indexOf(listener);
	if (i > -1) listeners.splice(i, 1);
	_enforceLifeTime(source);
}
