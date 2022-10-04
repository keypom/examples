export const get = window.get = (k) => {
	const v = localStorage.getItem(k);
	if (!/\{|\[/.test(v?.charAt(0))) {
		return v;
	}
	try {
		return JSON.parse(v);
	} catch (e) {
		console.warn(e);
	}
};
export const set = window.set = (k, v) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
export const del = window.del = (k) => localStorage.removeItem(k);

export const file = (fn, data) => {
	// Dynamically create a File
	const file = new File([data], fn);
    // Create a link and set the URL using `createObjectURL`
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = URL.createObjectURL(file);
    link.download = file.name;

    // It needs to be added to the DOM so it can be clicked
    document.body.appendChild(link);
    link.click();

    // To make this work on Firefox we need to wait
    // a little while before removing it.
    setTimeout(() => {
        URL.revokeObjectURL(link.href);
        link.parentNode.removeChild(link);
    }, 0);
}