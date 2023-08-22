const COUNT = 100;
const TESTS = 100;

const user = { name: "John" };
const proxy = new Proxy(user, {
	get(target, prop) {
		return target[prop];
	},
});

console.log("Naked: ");
let naked = 0;
for (let t = 0; t < TESTS; t++) {
	let start = performance.now();
	for (let i = 0; i < COUNT; i++) {
		user.name;
	}
	naked += (performance.now() - start) / TESTS;
}
console.log(naked);

console.log("With proxy: ");
withProxy = 0;
for (let t = 0; t < TESTS; t++) {
	let start = performance.now();
	for (let i = 0; i < COUNT; i++) {
		proxy.name;
	}
	withProxy += (performance.now() - start) / TESTS;
}
console.log(withProxy);

console.log("ratio: " + withProxy / naked);

// ----------------

// const iterator = document.createNodeIterator(document.body, NodeFilter.SHOW_COMMENT);
// const now = performance.now();
// let count = 0;
// while (iterator.nextNode()) {
// 	if (iterator.referenceNode.nodeValue.includes("a")) count++;
// }
// console.log("count is " + count);
// console.log(performance.now() - now);
