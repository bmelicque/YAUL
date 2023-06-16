const _id = {
	_: 0,
	get(): string {
		return "" + this._++;
	},
};

const _signals = new Map<string, Signal<any>>();

type _SignalPrivates<Type> = {
	id: string;
	expression: (() => Type) | undefined;
	value: Type;
	dependencies: Signal<any>[];
	listeners: Signal<any>[];
	elements: HTMLElement[];
	elementExpressions: Map<HTMLElement, (value: any) => any>;
};

const _privates = new WeakMap<Signal<any>, _SignalPrivates<any>>();

const _elements = new Map<string, HTMLElement | Text>();

// TODO: Le signal peut être lié à des TextNodes et des HTMLElements

function _enforceLifeTime(signal: Signal<any>) {
	const privates = _privates.get(signal);
	if (!privates || privates.elements.length || privates.listeners.length) return;

	_signals.delete(privates.id);
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

function _removeDOMElement(signalId: string, elementId: string) {
	const signal = _signals.get(signalId);
	if (!signal) return;
	const elements = _privates.get(signal)?.elements;
	if (!elements) return;
	for (let i = 0; i < elements.length; i++) {
		if (elements[i].getAttribute("i-id") === elementId) {
			elements.splice(i, 1);
			break;
		}
	}
	_enforceLifeTime(signal);
}

function _emit(source: Signal<any>) {
	const privates = _privates.get(source);
	if (!privates) return;
	for (const element of privates.elements) {
		element.innerHTML = privates.elementExpressions.get(element)?.(privates.value) ?? privates.value;

		if (element.tagName === "#text") {
		}

		if (element.tagName === "INPUT") {
			element.setAttribute("value", privates.elementExpressions.get(element)?.(privates.value) ?? privates.value);
		}
	}
	for (const listener of privates.listeners) {
		const expression = _privates.get(listener)?.expression;
		if (expression) {
			listener.value = expression();
		}
	}
}

export class Signal<Type> {
	constructor(init: Type);
	constructor(init: () => Type, ...dependencies: Signal<any>[]);
	constructor(init: Type | (() => Type), ...dependencies: Signal<any>[]) {
		const id = _id.get();
		_signals.set(id, this);
		_privates.set(this, {
			id,
			expression: init instanceof Function ? init : undefined,
			value: init instanceof Function ? init() : init,
			dependencies,
			listeners: [],
			elements: [],
			elementExpressions: new Map(),
		});
		for (const dependency of dependencies) {
			_privates.get(dependency)?.listeners.push(this);
		}
	}

	// TODO: see for JSX
	// TODO: save expression with element (Map?)
	element(expression?: (value: Type) => any) {
		const privates = _privates.get(this)!;
		const element = document.createElement("s-val");
		const text = document.createTextNode(expression?.(privates.value) ?? "" + privates.value);
		element.append(text);
		element.dataset.signal = `${privates?.id ?? ""}-${_id.get()}`;
		element.setAttribute("s-id", privates?.id ?? "");
		element.setAttribute("i-id", "" + _id.get());
		privates.elements.push(element);
		if (expression) {
			privates.elementExpressions.set(element, expression);
		}
		return element;
	}

	get value() {
		return _privates.get(this)?.value;
	}

	set value(value: Type) {
		if (_privates.get(this)) {
			_privates.get(this)!.value = value;
		}
		_emit(this);
	}
}

const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (const node of mutation.removedNodes) {
			// TODO parse subnodes !
			removeRecursively(node);
			if (node.nodeName === "SIG") {
				_removeDOMElement(
					(node as HTMLElement).getAttribute("s-id") ?? "",
					(node as HTMLElement).getAttribute("i-id") ?? ""
				);
			}
		}
	}
});

// TODO supprimer de façon asynchrone
//      (Pour éviter par exemple de bloquer le render d'une page en supprimant l'ancienne)
function removeRecursively(node: Node) {
	for (const childNode of node.childNodes) {
		removeRecursively(childNode);
	}
	if (node.nodeName === "#comment") {
		const res = node.nodeValue?.trim().match(/^s-(\d?)-(\d?)$/);
		if (!res) return;
		return _removeDOMElement(res[1], res[2]);
	}
	if (node instanceof HTMLElement) {
		const id = node.dataset.signal;
		if (!id) return;
		console.log(id);
	}
}

// TODO: After DOM load
observer.observe(document.querySelector("body")!, { childList: true, subtree: true });

function _bind(element: HTMLElement, signal: Signal<any>) {
	const privates = _privates.get(signal);
	if (!privates) return;
	element.innerText = privates.value;
	element.setAttribute("s-id", privates?.id ?? "");
	element.setAttribute("i-id", "" + _id.get());
	privates.elements.push(element);
	return element;
}

/**
 *  OLD VERSION
 */
// export class Signal<Type> {
// 	#id: string;
// 	#expression: (() => Type) | undefined;
// 	#value: Type;
// 	readonly #dependencies: readonly Signal<any>[];
// 	#listeners: Signal<any>[];
// 	#elements: HTMLElement[];
// 	#elementExpressions: Map<HTMLElement, (value: Type) => any>;
// 	// Besoin de supprimer à partir de l'id
// 	// itérer sur élément + expression

// 	constructor(init: Type);
// 	constructor(init: () => Type, ...dependencies: Signal<any>[]);
// 	constructor(init: Type | (() => Type), ...dependencies: Signal<any>[]) {
// 		this.#id = _id.get();
// 		if (init instanceof Function) {
// 			this.#expression = init;
// 		}
// 		this.#value = init instanceof Function ? init() : init;
// 		this.#dependencies = Object.freeze(dependencies);
// 		this.#listeners = [];
// 		this.#elements = [];
// 		this.#elementExpressions = new Map();
// 		for (const dependency of dependencies) {
// 			dependency.addListener(this);
// 		}
// 		_signals.set(this.#id, this);
// 	}

// 	addListener(listener: Signal<any>) {
// 		this.#listeners.push(listener);
// 	}

// 	removeListener(listener: Signal<any>) {
// 		for (let i = 0; i < this.#listeners.length; i++) {
// 			if (this.#listeners[i] === listener) {
// 				this.#listeners.splice(i, 1);
// 				break;
// 			}
// 		}
// 		if (!this.#elements.length && !this.#listeners.length) {
// 			for (const dependency of this.#dependencies) {
// 				dependency.removeListener(this);
// 			}
// 			_signals.delete(this.#id);
// 		}
// 	}

// 	// TODO: see for JSX
// 	// TODO: save expression with element (Map?)
// 	element(expression?: (value: Type) => any) {
// 		const element = document.createElement("sig");
// 		element.innerText = expression?.(this.#value) ?? "" + this.#value;
// 		element.setAttribute("s-id", "" + this.#id);
// 		element.setAttribute("i-id", "" + _id.get());
// 		this.#elements.push(element);
// 		if (expression) {
// 			this.#elementExpressions.set(element, expression);
// 		}
// 		return element;
// 	}

// 	dropElement(id: string) {
// 		for (let i = 0; i < this.#elements.length; i++) {
// 			if (this.#elements[i].getAttribute("i-id") === id) {
// 				this.#elements.splice(i, 1);
// 				break;
// 			}
// 		}
// 		if (!this.#elements.length && !this.#listeners.length) {
// 			for (const dependency of this.#dependencies) {
// 				dependency.removeListener(this);
// 			}
// 			_signals.delete(this.#id);
// 		}
// 	}

// 	private _emit() {
// 		for (let i = 0; i < this.#elements.length; i++) {
// 			this.#elements[i].innerText = this.#elementExpressions.get(this.#elements[i])?.(this.#value) ?? this.#value;
// 		}
// 		for (const listener of this.#listeners) {
// 			listener.refresh();
// 		}
// 	}

// 	// TODO: only derived value?
// 	refresh() {
// 		if (this.#expression) {
// 			this.#value = this.#expression();
// 		}
// 		this._emit();
// 	}

// 	// TODO: only source signals?
// 	get value() {
// 		return this.#value;
// 	}

// 	// TODO: only source signals?
// 	set value(value: Type) {
// 		this.#value = value;
// 		this._emit();
// 	}
// }
// const observer = new MutationObserver((mutations) => {
// 	for (const mutation of mutations) {
// 		for (const node of mutation.removedNodes) {
// 			if (node.nodeName === "SIG") {
// 				_signals
// 					.get((node as HTMLElement).getAttribute("s-id") ?? "")
// 					?.dropElement((node as HTMLElement).getAttribute("i-id") ?? "");
// 			}
// 		}
// 	}
// });

/*******************
 *     TESTING     *
 *******************/

console.log("haha");
const count = new Signal(0);

document.body.append(count.element());
const button = document.createElement("button");
button.innerText = "+1";
document.body.append(button);
button.addEventListener("click", () => count.value++);

const text = new Signal("");
const input = document.createElement("input");
_bind(input, text);
document.body.append(input);
input.addEventListener("input", (e: Event) => (text.value = (e.currentTarget as any)?.value ?? ""));

const div = document.createElement("div");
div.setAttribute("id", "test-id");
div.innerHTML = "<!-- s-1-2 -->Hey!";
document.body.append(div);

setTimeout(() => {
	// div.remove();
	// document.body.innerHTML = "";
}, 3000);

const textNode = document.createTextNode("h");
console.log(textNode.nodeName);
document.body.append(textNode);
textNode.nodeValue = "b";
