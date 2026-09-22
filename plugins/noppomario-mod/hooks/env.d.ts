// The engine gives a hooks module a real `import.meta.url`, which is how a
// hook finds a sibling script to run. `/plugin-types` does not declare it.
interface ImportMeta {
	readonly url: string
}
