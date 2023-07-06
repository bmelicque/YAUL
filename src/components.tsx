import { deriveSignal, jsx } from "./signal";

type Signal<Type> = ReturnType<typeof deriveSignal<Type>>;

function CommentElement() {
	return document.createComment("");
}

type ShowProps = {
	when: Signal<any>;
	children: JSX.Element | JSX.Element[];
	fallback?: JSX.Element;
};

export function Show(props: ShowProps) {
	const signal = deriveSignal(
		(() => {
			const falsy = <CommentElement />;
			const truthy = Array.isArray(props.children) ? <>{...props.children}</> : props.children;
			return () => {
				return props.when.value ? truthy : falsy;
			};
		})(),
		[props.when]
	);
	return <>{signal}</>;
}

// TODO: typer les signaux
type ForProps<Type> = {
	of: Signal<Type[]>; // TODO: valeur non-signal ?
	children: ((value: Type, index: number) => Node) | [(value: Type) => Node];
};

export function For<Type>(props: ForProps<Type>) {
	const fn = Array.isArray(props.children) ? props.children[0] : props.children;
	const signal = deriveSignal<Node[]>(() => props.of.value.map(fn), [props.of]);
	return <>{signal}</>;
}
