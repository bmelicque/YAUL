import { For } from "./components";
import { createSignal, jsx } from "./signal";

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

document.body.append(
	<div>
		<Input />
		<button onClick={addTodo}>Add</button>
		<For of={todos}>
			{(todo) => (
				<div>
					{todo.description}
					<button onClick={() => removeTodo(todo.id)}>Remove</button>
				</div>
			)}
		</For>
	</div>
);
