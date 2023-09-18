import { $LISTENERS, Signal } from "./signal";
import { toNode } from "./dom";
import { Reactive, Store } from "./store";

type ShowProps = {
	when: Signal<any>;
	children: string | JSX.Element | JSX.Element[];
	fallback?: JSX.Element;
};

class Toggler {
	status: boolean;
	content: Node[];
	fallback: Node;
	fragment = new DocumentFragment();

	constructor(when: Signal<any>, content: string | JSX.Element | JSX.Element[], fallback: JSX.Element | undefined) {
		this.status = !!when();
		this.content = Array.isArray(content) ? content.map(toNode) : [toNode(content)];
		this.fragment.append(...this.content);
		this.fallback = toNode(fallback);
	}

	update(when: any) {
		const status = !!when;
		if (status && !this.status) {
			this.fallback.parentNode?.replaceChild(this.fragment, this.fallback);
		} else if (!status && this.status) {
			const target = this.content[0];
			target.parentNode?.insertBefore(this.fallback, target);
			this.fragment.append(...this.content);
		}
		this.status = status;
	}
}

/**
 * Provides control flow over the UI.
 *
 * Shows its children when the `when` signal prop is truthy.
 * Else, displays nothing or a fallback if provided.
 */
export function Show(props: ShowProps) {
	const toggler = new Toggler(props.when, props.children, props.fallback);
	props.when[$LISTENERS] ??= [];
	props.when[$LISTENERS].push((value) => toggler.update(value));
	return toggler.status ? toggler.fragment : toggler.fallback;
}

class Mapper<Type> {
	comments: [Comment, ...Comment[]] = [new Comment()];

	constructor(private source: Store<Type[]>, private renderer: (signal: Reactive<Type>, index: number) => Node) {}

	/**
	 * Pushes a node at the end of the component
	 * @param node
	 */
	pushNode(node: Node) {
		const currentLast = this.comments[this.comments.length - 1];
		const newLast = new Comment();
		this.comments.push(newLast);
		currentLast.parentNode?.insertBefore(newLast, currentLast.nextSibling);
		newLast.parentNode?.insertBefore(node, newLast);
	}

	/**
	 * removes the last node
	 */
	popNode() {
		if (this.comments.length <= 1) return;
		const last = this.comments[this.comments.length - 1];
		const secondToLast = this.comments[this.comments.length - 2];
		while (last.previousSibling && last.previousSibling !== secondToLast) {
			last.previousSibling.remove();
		}
		last.remove();
		this.comments.pop();
	}

	update() {
		for (let i = this.comments.length - 1; i < this.source().length; i++) {
			this.pushNode(renderer(this.source, i));
		}
	}
}

// type MapperCallback<Type> = (value: Signal<Type>, index: number) => Node;

// type ForProps<Type> = {
// 	of: Signal<Type[]>;
// 	children: MapperCallback<Type> | [MapperCallback<Type>];
// };

// class Mapper<Type> implements ComponentHandler {
// 	nodes: Node[] = [];
// 	fn: MapperCallback<Type>;
// 	end: Comment;
// 	arraySignal: Signal<Type[]>;
// 	signals: Signal<Type>[] = [];

// 	constructor(arraySignal: Signal<Type[]>, fn: MapperCallback<Type>, end: Comment) {
// 		this.arraySignal = arraySignal;
// 		this.fn = fn;
// 		this.end = end;
// 	}

// 	handle() {
// 		if (this.nodes.length < this.arraySignal.value.length) {
// 			for (let i = this.nodes.length; i < this.arraySignal.value.length; i++) {
// 				const signal = deriveSignal(() => this.arraySignal.value[i], [this.arraySignal]);
// 				this.signals.push(signal);
// 				const comment = new Comment(`y0[${i}]`); // TODO right index
// 				this.nodes.push(comment);
// 				this.end.parentNode?.insertBefore(comment, this.end);
// 				const node = this.fn(signal, i);
// 				this.end.parentNode?.insertBefore(node, this.end);
// 			}
// 			console.log(this.signals.map((signal) => ({ ...signal.value })));
// 			return;
// 		}

// 		if (this.arraySignal.value.length < this.nodes.length) {
// 			let node = this.end.previousSibling;
// 			const target = this.nodes[this.arraySignal.value.length];
// 			while (node && node !== target) {
// 				node.remove();
// 				node = this.end.previousSibling;
// 			}
// 			for (const signal of this.signals.splice(this.arraySignal.value.length)) {
// 				// TODO destroy signal
// 			}
// 			console.log(this.signals.map((signal) => ({ ...signal.value })));
// 			return;
// 		}
// 	}
// }

// export function For<Type>(props: ForProps<Type>) {
// 	const fragments = new DocumentFragment();
// 	const end = new Comment();
// 	fragments.append(end);
// 	const handler = new Mapper(props.of, Array.isArray(props.children) ? props.children[0] : props.children, end);
// 	handler.handle();
// 	props.of[$COMPONENT_HANDLERS] ??= [];
// 	props.of[$COMPONENT_HANDLERS].push(handler);
// 	return fragments;
// }
