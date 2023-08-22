import { $COMPONENT_HANDLERS, $VALUE, Signal, deriveSignal } from "./signal-old";

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
	const handler = new Toggler(!!props.when[$VALUE], props.children);
	props.when[$COMPONENT_HANDLERS] ??= [];
	props.when[$COMPONENT_HANDLERS].push(handler);
	return handler.status ? handler.fragment : handler.comment;
}

type MapperCallback<Type> = (value: Signal<Type>, index: number) => Node;

type ForProps<Type> = {
	of: Signal<Type[]>;
	children: MapperCallback<Type> | [MapperCallback<Type>];
};

class Mapper<Type> implements ComponentHandler {
	nodes: Node[] = [];
	fn: MapperCallback<Type>;
	end: Comment;
	arraySignal: Signal<Type[]>;
	signals: Signal<Type>[] = [];

	constructor(arraySignal: Signal<Type[]>, fn: MapperCallback<Type>, end: Comment) {
		this.arraySignal = arraySignal;
		this.fn = fn;
		this.end = end;
	}

	handle() {
		if (this.nodes.length < this.arraySignal.value.length) {
			for (let i = this.nodes.length; i < this.arraySignal.value.length; i++) {
				const signal = deriveSignal(() => this.arraySignal.value[i], [this.arraySignal]);
				this.signals.push(signal);
				const comment = new Comment(`y0[${i}]`); // TODO right index
				this.nodes.push(comment);
				this.end.parentNode?.insertBefore(comment, this.end);
				const node = this.fn(signal, i);
				this.end.parentNode?.insertBefore(node, this.end);
			}
			console.log(this.signals.map((signal) => ({ ...signal.value })));
			return;
		}

		if (this.arraySignal.value.length < this.nodes.length) {
			let node = this.end.previousSibling;
			const target = this.nodes[this.arraySignal.value.length];
			while (node && node !== target) {
				node.remove();
				node = this.end.previousSibling;
			}
			for (const signal of this.signals.splice(this.arraySignal.value.length)) {
				// TODO destroy signal
			}
			console.log(this.signals.map((signal) => ({ ...signal.value })));
			return;
		}
	}
}

export function For<Type>(props: ForProps<Type>) {
	const fragments = new DocumentFragment();
	const end = new Comment();
	fragments.append(end);
	const handler = new Mapper(props.of, Array.isArray(props.children) ? props.children[0] : props.children, end);
	handler.handle();
	props.of[$COMPONENT_HANDLERS] ??= [];
	props.of[$COMPONENT_HANDLERS].push(handler);
	return fragments;
}
