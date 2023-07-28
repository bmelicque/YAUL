import { Signal, _privates, deriveSignal } from "./signal";
import { fragmentsToFlatArray, jsx, replaceNode, toNode } from "./dom";

export type ComponentHandler = {
	handle: (value: any) => void;
};

type ShowProps = {
	when: Signal<any>;
	children: JSX.Element | JSX.Element[];
	fallback?: JSX.Element;
};

class Toggler implements ComponentHandler {
	status: boolean;
	content: Node | Node[];
	fragment = new DocumentFragment();
	comment = new Comment();

	constructor(initalStatus: boolean, content: Node | Node[]) {
		this.status = initalStatus;
		this.content = content;
		if (Array.isArray(content)) {
			this.fragment.append(...content);
		} else {
			this.fragment.append(content);
		}
	}

	handle(value: any) {
		if (value && !this.status) {
			this.comment.parentNode?.replaceChild(this.fragment, this.comment);
		} else if (!value && this.status) {
			const target: Node = Array.isArray(this.content) ? this.content[0] : this.content;
			target.parentNode?.insertBefore(this.comment, target);
			if (Array.isArray(this.content)) {
				this.fragment.append(...this.content);
			} else {
				this.fragment.append(this.content);
			}
		}
		this.status = !!value;
	}
}

export function Show(props: ShowProps): Node {
	const p = _privates.get(props.when);
	if (!p) return <></>;
	const handler = new Toggler(!!p.value, props.children);
	p.componentHandlers ??= [];
	p.componentHandlers.push(handler);
	return handler.status ? handler.fragment : handler.comment;
}

type MapperCallback<Type> = (value: Type, index: number) => Node;

type ForProps<Type> = {
	of: Signal<Type[]>;
	children: MapperCallback<Type> | [MapperCallback<Type>];
};

class Mapper<Type> implements ComponentHandler {
	previousValue: Type[] = [];
	nodes: (Node | Node[])[] = [];
	fn: MapperCallback<Type>;
	end: Comment;

	constructor(fn: MapperCallback<Type>, end: Comment) {
		this.fn = fn;
		this.end = end;
	}

	handle(array: Type[]) {
		if (array === this.previousValue) return;
		const min = Math.min(array.length, this.previousValue.length);
		for (let i = 0; i < min; i++) {
			if (array[i] === this.previousValue[i]) continue;

			const node = this.fn(array[i], i);
			const old = this.nodes[i];
			if (Array.isArray(old)) {
				const last = old.pop();
				if (!last) continue;
				for (const el of old) {
					el.parentNode?.removeChild(el);
				}
				replaceNode(node, last);
			} else {
				replaceNode(node, old);
			}
			this.nodes[i] = this.fn(array[i], i);
		}

		const spliced = this.nodes.splice(min);
		for (const node of spliced) {
			if (Array.isArray(node)) {
				for (const subnode of node) {
					subnode.parentNode?.removeChild(subnode);
				}
			} else {
				node.parentNode?.removeChild(node);
			}
		}

		for (let i = min; i < array.length; i++) {
			const node = this.fn(array[i], i);
			this.nodes.push(node instanceof DocumentFragment ? fragmentsToFlatArray(node) : node);
			this.end.parentNode?.insertBefore(node, this.end);
		}
	}
}

export function For<Type>(props: ForProps<Type>) {
	const fragments = new DocumentFragment();
	const p = _privates.get(props.of);
	if (!p) return fragments;
	const end = new Comment();
	fragments.append(end);
	const handler = new Mapper(Array.isArray(props.children) ? props.children[0] : props.children, end);
	handler.handle(props.of.value);
	p.componentHandlers ??= [];
	p.componentHandlers.push(handler);
	return fragments;
}
