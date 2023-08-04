import { jsx } from "./dom";
import { createSignal } from "./signal";
import { For, Show } from "./components";

export { jsx } from "./dom";
export { createSignal, deriveSignal } from "./signal";
export { For, Show } from "./components";

type Todo = {
	id: number;
	description: string;
	done: boolean;
};

let nextId = 0;

const todos = createSignal<Todo[]>([]);

function addTodo() {
	todos.value.push({
		id: nextId++,
		description: input.value,
		done: false,
	});
	todos.value = todos.value;
	input.value = "";
}

function removeTodo(id: number) {
	todos.value = todos.value.filter((value) => value.id !== id);
}

const input = createSignal("");

function Input() {
	const onInput = (e: Event) => {
		input.value = (e.currentTarget as HTMLInputElement).value;
	};

	return (
		<input onInput={onInput} value={input}>
			{input}
		</input>
	);
}

const bool = createSignal(true);

document.body.append(
	<>
		<div>
			<Show when={bool}>
				<input />
			</Show>
			<button onClick={() => (bool.value = !bool.value)}>Toggle</button>
		</div>
		<div>
			<Input />
			<button onClick={addTodo}>Add</button>
			<For of={todos}>
				{(todo) => (
					<div>
						{todo.value.description}
						<button onClick={() => removeTodo(todo.value.id)}>Remove</button>
					</div>
				)}
			</For>
		</div>
	</>
);
