import { ComponentHandler } from "./components";
import { getOwner, updateNode } from "./dom";

// TODO:
//	- css? tailwind?

/***************
 *   SIGNALS   *
 ***************/

export const $ID = Symbol("id");
export const $EXPRESSION = Symbol("expression");
export const $VALUE = Symbol("value");
export const $DEPENDENCIES = Symbol("dependencies");
export const $DERIVED_SIGNALS = Symbol("derived");
export const $COMPONENT_HANDLERS = Symbol("handlers");
export const $NODES = Symbol("nodes");
export const $OWNER = Symbol("owner");

const _signals = new Map<number, Signal<any>>();
export const owners = new Map<number, Signal<any>[]>();

export function createSignal<Type>(init: Type): Signal<Type> {
	return new Signal<Type>(init);
}

export function deriveSignal<Type>(expression: () => Type, dependencies: Signal<any>[]): Signal<Type> {
	const signal = new Signal<Type>(expression());
	Object.defineProperty(signal, $EXPRESSION, { value: expression });
	Object.defineProperty(signal, $DEPENDENCIES, { value: dependencies });
	for (const dependency of dependencies) {
		addDerivedSignal(dependency, signal);
	}
	return signal;
}

export class Signal<Type> {
	readonly [$ID]!: number;
	readonly [$OWNER]!: number | undefined;
	[$NODES]!: Node[]; // TODO: optionnal
	[$VALUE]!: Type;
	[$EXPRESSION]?: () => Type;
	[$DEPENDENCIES]?: Signal<any>[];
	[$DERIVED_SIGNALS]?: Signal<any>[];
	[$COMPONENT_HANDLERS]?: ComponentHandler[];

	constructor(value: Type) {
		Object.defineProperty(this, $ID, { value: generateId() });
		Object.defineProperty(this, $OWNER, { value: getOwner() });
		Object.defineProperty(this, $VALUE, { value, writable: true });
		Object.defineProperty(this, $NODES, { value: [] });

		_signals.set(this[$ID], this);

		if (this[$OWNER] !== undefined) {
			if (!owners.has(this[$OWNER])) owners.set(this[$OWNER], [this]);
			else owners.get(this[$OWNER])?.push(this);
		}
	}

	get value(): Type {
		return this[$VALUE];
	}

	set value(value: Type) {
		this[$VALUE] = value;
		emit(this);
	}
}

function addDerivedSignal(signal: Signal<any>, derived: Signal<any>) {
	if (!signal[$DERIVED_SIGNALS]) Object.defineProperty(signal, $DERIVED_SIGNALS, { value: [derived] });
	else signal[$DERIVED_SIGNALS].push(derived);
}

function emit(source: Signal<any>) {
	for (let i = 0; i < source[$NODES].length; i++) {
		source[$NODES][i] = updateNode(source[$NODES][i], source.value);
	}
	if (source[$DERIVED_SIGNALS])
		for (const derivedSignal of source[$DERIVED_SIGNALS]) {
			derivedSignal.value = derivedSignal[$EXPRESSION]?.();
		}
	if (source[$COMPONENT_HANDLERS]) {
		for (const handler of source[$COMPONENT_HANDLERS]) {
			handler.handle(source[$VALUE]);
		}
	}
}

function destroySignal(signal: Signal<any>) {
	_signals.delete(signal[$ID]);
	const dependencies = signal[$DEPENDENCIES];
	if (dependencies) {
		for (const dependency of dependencies) {
			_removeListener(dependency, signal);
		}
	}
}

export const generateId = (
	(_: number) => () =>
		_++
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
		// TODO change algo:
		//		startsWith y-
		//		split("=")[1]
		//		split("-")
		//		if signal:
		//			nextSibling, find in signal
		//		if stack:
		//			remove owner
		// TODO try yX=[A, B] where X is either owner/component
		const res = node.nodeValue?.trim().match(/^y-\w+=(\d+)$/);
		if (!res) return;
		return removeElement(res[1]);
	}
}

function removeElement(id: string) {
	const [signalId, elementIndex] = id.split("-");
	const signal = _signals.get(parseInt(signalId));
	if (!signal) return;
	let index = parseInt(elementIndex);
	if (Number.isNaN(index)) return;
	signal[$NODES].splice(index, 1);
	_enforceLifeTime(signal);
}

function _enforceLifeTime(signal: Signal<any>) {
	if (signal[$NODES].length || signal[$DERIVED_SIGNALS]?.length) return;

	_signals.delete(signal[$ID]);
	if (signal[$DEPENDENCIES])
		for (const dependency of signal[$DEPENDENCIES]) {
			_removeListener(dependency, signal);
		}
}

function _removeListener(source: Signal<any>, listener: Signal<any>) {
	const derivedSignals = source[$DERIVED_SIGNALS];
	if (!derivedSignals) return;
	const i = derivedSignals.indexOf(listener);
	if (i > -1) derivedSignals.splice(i, 1);
	_enforceLifeTime(source);
}
