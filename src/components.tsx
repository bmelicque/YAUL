import { Signal, deriveSignal } from "./signal";
import { jsx } from "./dom";

function CommentElement() {
	return document.createComment("");
}

type ShowProps = {
	when: Signal<any>;
	children: string | JSX.Element | JSX.Element[];
	fallback?: JSX.Element;
};

export function Show(props: ShowProps) {
	return (
		<>
			{deriveSignal(
				(() => {
					const placeholder = <CommentElement />;
					return () => (props.when.value ? props.children : placeholder);
				})(),
				[props.when]
			)}
		</>
	);
}

type ForProps<Type> = {
	of: Signal<Type[]>;
	children: ((value: Type, index: number) => Node) | [(value: Type) => Node];
};

export function For<Type>(props: ForProps<Type>) {
	const fn = Array.isArray(props.children) ? props.children[0] : props.children;
	const signal = deriveSignal<Node[]>(() => props.of.value.map(fn), [props.of]);
	return <>{signal}</>;
}
