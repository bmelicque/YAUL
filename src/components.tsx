import { $listeners, Signal } from "./signal";
import { Reactive, Store } from "./store";
import { toNode } from "./dom";

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
	props.when[$listeners] ??= [];
	props.when[$listeners].push((value) => toggler.update(value));
	return toggler.status ? toggler.fragment : toggler.fallback;
}

type Renderer<Type> = (value: Reactive<Type>, index: number) => JSX.Element;

class Mapper<Type> {
	comments: [Comment, ...Comment[]] = [new Comment()];

	constructor(private source: Store<Type[]>, private renderer: Renderer<Type>) {}

	/**
	 * Pushes a node at the end of the component
	 * @param node
	 */
	pushNode(node: JSX.Element) {
		const currentLast = this.comments[this.comments.length - 1];
		const newLast = new Comment();
		this.comments.push(newLast);
		currentLast.parentNode?.insertBefore(newLast, currentLast.nextSibling);
		newLast.parentNode?.insertBefore(toNode(node), newLast);
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
		// don't forget that there are n+1 comments (start comment + end of each node)
		while (this.source().length < this.comments.length - 1) {
			this.popNode();
		}
		for (let i = this.comments.length - 1; i < this.source().length; i++) {
			this.pushNode(this.renderer(this.source[i], i));
		}
	}
}

type ForProps<Type> = {
	of: Store<Type[]>;
	children: Renderer<Type> | [Renderer<Type>];
};

/**
 * Allows mapping elements to the UI.
 *
 * @component
 *
 * Takes an array store as its mapping source and a render function as its child.
 *
 * @example
 *
 * ```
 * 	const fruits = createStore(['apple', 'orange', 'banana'])
 * 	return <For of={fruits}>
 * 		(fruit, index) => <article>Fruit #{index + 1}: {fruit}</article>
 * 	</For>
 * ```
 */
export function For<Type>(props: ForProps<Type>) {
	if (Array.isArray(props.children)) props.children = props.children[0];
	const mapper = new Mapper(props.of, props.children);
	const fragment = new DocumentFragment();
	fragment.append(mapper.comments[0]);
	mapper.update();
	props.of[$listeners] ??= [];
	props.of[$listeners].push(() => mapper.update());
	return fragment;
}
