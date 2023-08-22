const target = { a: "a" };

const proxy = new Proxy(target, {
	get(target, prop, receiver) {
		console.log("getting ", target, prop, receiver);
	},
	set(target, prop, value, receiver) {
		console.log("setting ", target, prop, receiver);
		target[prop] = value;
	},
});

proxy.b = "b";

proxy.a;
proxy.b;

Object.defineProperty(Object.prototype, "map", {
	value: function (callback) {
		const obj = {};
		for (const key in this) {
			obj[key] = callback(this[key], key);
		}
		return obj;
	},
});

const test = { a: 0, b: 1, c: 2, d: 3 };
console.log(test.map((value) => value ** 2));

const $EXPRESSION = Symbol("expression");
const $VALUE = Symbol("value");
const $DERIVED_SIGNALS = Symbol("derived");
const $EMIT = Symbol();

class S {
	constructor(value) {
		// this[$VALUE] = value;
		// for (const key in this) {
		// 	const prop = Object.getOwnPropertyDescriptor(this, key);
		// 	if (prop) prop.enumerable = false;
		// }
		Object.defineProperties(this, {
			[$VALUE]: { value, writable: true },
		});
	}

	[$EMIT]() {
		if (this[$DERIVED_SIGNALS]) {
			for (const computed of this[$DERIVED_SIGNALS]) {
				computed[$VALUE] = computed[$EXPRESSION]?.();
			}
		}
	}
}

console.log(new S(0));
