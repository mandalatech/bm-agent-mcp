// Build stub for the Vercel `ai` package.
//
// `agents/dist/mcp/client.js` does a dynamic `import("ai")` to pull in
// `jsonSchema`, but ONLY in the MCP *client* code path. This worker is an MCP
// *server* (McpAgent) and never runs that path, so the import is dead code the
// esbuild bundler nonetheless has to resolve. Aliasing "ai" to this stub keeps
// the worker lean instead of pulling in the full Vercel AI SDK.
//
// Wired via the `alias` block in wrangler.jsonc. If a future change actually
// uses the MCP client here, replace this with the real `ai` dependency.
export function jsonSchema(schema) {
	return schema;
}
