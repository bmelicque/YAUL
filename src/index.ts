import { Signal } from "./signal";

const signal = new Signal(2);

document.getElementById("entry")?.append(signal.element());
