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
	const input = document.getElementById("input");
	if (!(input instanceof HTMLInputElement)) return;

	const description = input.value ?? "";
	input.value = "";

	todos.value.push({
		id: nextId++,
		description,
		done: false,
	});
	todos.value = todos.value;
}

function removeTodo(id: number) {
	todos.value = todos.value.filter((value) => value.id !== id);
}

document.body.append(
	<div>
		<input id="input" />
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
