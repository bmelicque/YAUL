import { jsx } from "./dom";
import { createSignal } from "./signal-old";
import { $ID, createStore } from "./signal";
import { Show } from "./components";

export { jsx } from "./dom";
export { createSignal, deriveSignal } from "./signal-old"; // TODO
export { Show } from "./components";

type Todo = {
	id: number;
	description: string;
	done: boolean;
};

let nextId = 0;

const todos = createStore<Todo[]>([]);

function addTodo() {
	todos.push({
		id: nextId++,
		description: input.value,
		done: false,
	});
	input.value = "";
	console.log(todos);
}

function removeTodo(id: number) {
	const index = todos.findIndex((value) => value.id === id);
	todos.splice(index, 1);
}

const input = createStore({ value: "" });

function Input() {
	const onInput = (e: Event) => {
		input.value = (e.currentTarget as HTMLInputElement).value;
	};

	return (
		<input onInput={onInput} value={input.value}>
			{input.value}
		</input>
	);
}

const bool = createStore({ value: false });
console.log(bool.value[Symbol.toPrimitive]());
console.log(bool, bool.value, !bool.value);

document.body.append(
	<>
		<div>
			<Show when={bool.value}>
				<input />
			</Show>
			<button
				onClick={() => {
					console.log("click: ", bool.value, !bool.value);

					bool.value = !bool.value;
				}}
			>
				Toggle
			</button>
		</div>
		<div>
			<Input />
			<button onClick={addTodo}>Add</button>
			{/* <For of={todos}>
				{(todo) => (
					<div>
						{todo.value.description}
						<button onClick={() => removeTodo(todo.value.id)}>Remove</button>
					</div>
				)}
			</For> */}
		</div>
	</>
);
