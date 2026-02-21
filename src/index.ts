import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

const API_BASE = "https://booksmandala.com/api/agent/v1";

interface Env {
	MCP_OBJECT: DurableObjectNamespace;
	BM_API_KEY: string;
}

async function apiCall(path: string, apiKey: string): Promise<any> {
	const res = await fetch(`${API_BASE}${path}`, {
		headers: {
			"X-API-Key": apiKey,
			Accept: "application/json",
		},
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: res.statusText }));
		throw new Error((err as any).error || `API returned ${res.status}`);
	}

	return res.json();
}

function bookToText(book: any): string {
	const parts = [
		`**${book.title}**`,
		book.authors?.length ? `by ${book.authors.join(", ")}` : null,
		`Price: ${book.price} | ${book.in_stock ? "In Stock" : "Out of Stock"}`,
		book.isbn ? `ISBN: ${book.isbn}` : null,
		book.genres?.length ? `Genres: ${book.genres.join(", ")}` : null,
		book.description ? `\n${book.description}` : null,
		book.url ? `\nBuy: ${book.url}` : null,
	];
	return parts.filter(Boolean).join("\n");
}

function bookDetailToText(book: any): string {
	const parts = [
		`**${book.title}**`,
		book.alternate_title ? `(${book.alternate_title})` : null,
		book.authors?.length ? `by ${book.authors.join(", ")}` : null,
		`Price: ${book.price} | ${book.in_stock ? "In Stock" : "Out of Stock"}`,
		book.isbn ? `ISBN: ${book.isbn}` : null,
		book.publisher ? `Publisher: ${book.publisher}` : null,
		book.pages ? `Pages: ${book.pages}` : null,
		book.cover_type ? `Format: ${book.cover_type}` : null,
		book.edition ? `Edition: ${book.edition}` : null,
		book.weight_grams ? `Weight: ${book.weight_grams}g` : null,
		book.languages?.length ? `Languages: ${book.languages.join(", ")}` : null,
		book.genres?.length ? `Genres: ${book.genres.join(", ")}` : null,
		book.average_rating ? `Rating: ${book.average_rating}/5 (${book.reviews_count} reviews)` : null,
		book.description ? `\n${book.description}` : null,
		book.url ? `\nBuy: ${book.url}` : null,
	];
	return parts.filter(Boolean).join("\n");
}

export class BooksMandalaAgentMCP extends McpAgent<Env> {
	server = new McpServer({
		name: "Books Mandala",
		version: "1.0.0",
	});

	async init() {
		// Search books
		this.server.tool(
			"search_books",
			"Search for books by title, author name, or ISBN from Books Mandala's catalog of 50,000+ titles. Returns matching books with prices in NPR and stock availability.",
			{
				query: z.string().min(2).describe("Search query — book title, author name, or ISBN"),
				page: z.number().int().min(1).default(1).optional().describe("Page number (default 1)"),
				limit: z.number().int().min(1).max(50).default(20).optional().describe("Results per page, max 50 (default 20)"),
			},
			async ({ query, page, limit }) => {
				const params = new URLSearchParams({ q: query });
				if (page) params.set("page", String(page));
				if (limit) params.set("limit", String(limit));

				const data = await apiCall(`/search?${params}`, this.env.BM_API_KEY);
				const books = data.data.map(bookToText).join("\n\n---\n\n");
				const meta = data.meta;

				return {
					content: [
						{
							type: "text",
							text: books
								? `Found ${meta.results_on_page} results for "${query}" (page ${meta.page}):\n\n${books}${meta.has_more ? "\n\n_More results available — increase page number._" : ""}`
								: `No books found for "${query}".`,
						},
					],
				};
			},
		);

		// Get book details
		this.server.tool(
			"get_book",
			"Get detailed information about a specific book by ISBN or slug. Returns full details including description, publisher, pages, ratings, and purchase link.",
			{
				identifier: z.string().describe("ISBN (e.g. 9781847941831) or book slug (e.g. atomic-habits)"),
			},
			async ({ identifier }) => {
				try {
					const data = await apiCall(`/books/${identifier}`, this.env.BM_API_KEY);
					return {
						content: [{ type: "text", text: bookDetailToText(data.data) }],
					};
				} catch {
					return {
						content: [{ type: "text", text: `Book not found: ${identifier}` }],
					};
				}
			},
		);

		// List genres
		this.server.tool(
			"list_genres",
			"List all book genres available on Books Mandala. Returns genre names, slugs, and parent categories. Use genre slugs to browse books by genre.",
			{},
			async () => {
				const data = await apiCall("/genres", this.env.BM_API_KEY);
				const genres = data.data
					.map((g: any) => `- ${g.name} (${g.slug})${g.parent_slug ? ` — under ${g.parent_slug}` : ""}`)
					.join("\n");

				return {
					content: [{ type: "text", text: `${data.meta.total} genres available:\n\n${genres}` }],
				};
			},
		);

		// Browse books by genre
		this.server.tool(
			"browse_genre",
			"Browse books within a specific genre. Use a genre slug from list_genres.",
			{
				genre_slug: z.string().describe("Genre slug (e.g. fiction-and-literature, self-help, manga)"),
				page: z.number().int().min(1).default(1).optional().describe("Page number"),
				limit: z.number().int().min(1).max(50).default(20).optional().describe("Results per page"),
			},
			async ({ genre_slug, page, limit }) => {
				const params = new URLSearchParams();
				if (page) params.set("page", String(page));
				if (limit) params.set("limit", String(limit));
				const qs = params.toString() ? `?${params}` : "";

				try {
					const data = await apiCall(`/genres/${genre_slug}/books${qs}`, this.env.BM_API_KEY);
					const books = data.data.map(bookToText).join("\n\n---\n\n");
					return {
						content: [
							{
								type: "text",
								text: books
									? `Books in "${genre_slug}":\n\n${books}`
									: `No books found in genre "${genre_slug}".`,
							},
						],
					};
				} catch {
					return {
						content: [{ type: "text", text: `Genre not found: ${genre_slug}` }],
					};
				}
			},
		);

		// Bestsellers
		this.server.tool(
			"bestsellers",
			"Get current bestselling books on Books Mandala.",
			{
				page: z.number().int().min(1).default(1).optional().describe("Page number"),
				limit: z.number().int().min(1).max(50).default(20).optional().describe("Results per page"),
			},
			async ({ page, limit }) => {
				const params = new URLSearchParams();
				if (page) params.set("page", String(page));
				if (limit) params.set("limit", String(limit));
				const qs = params.toString() ? `?${params}` : "";

				const data = await apiCall(`/bestsellers${qs}`, this.env.BM_API_KEY);
				const books = data.data.map(bookToText).join("\n\n---\n\n");

				return {
					content: [{ type: "text", text: `Bestsellers:\n\n${books}` }],
				};
			},
		);

		// New arrivals
		this.server.tool(
			"new_arrivals",
			"Get recently added books (last 45 days) on Books Mandala.",
			{
				page: z.number().int().min(1).default(1).optional().describe("Page number"),
				limit: z.number().int().min(1).max(50).default(20).optional().describe("Results per page"),
			},
			async ({ page, limit }) => {
				const params = new URLSearchParams();
				if (page) params.set("page", String(page));
				if (limit) params.set("limit", String(limit));
				const qs = params.toString() ? `?${params}` : "";

				const data = await apiCall(`/new-arrivals${qs}`, this.env.BM_API_KEY);
				const books = data.data.map(bookToText).join("\n\n---\n\n");

				return {
					content: [{ type: "text", text: `New Arrivals:\n\n${books}` }],
				};
			},
		);

		// Get author
		this.server.tool(
			"get_author",
			"Get author details and their available books on Books Mandala.",
			{
				author_slug: z.string().describe("Author slug (e.g. james-clear, paulo-coelho)"),
				limit: z.number().int().min(1).max(50).default(20).optional().describe("Max books to return"),
			},
			async ({ author_slug, limit }) => {
				const params = new URLSearchParams();
				if (limit) params.set("limit", String(limit));
				const qs = params.toString() ? `?${params}` : "";

				try {
					const data = await apiCall(`/authors/${author_slug}${qs}`, this.env.BM_API_KEY);
					const author = data.data.author;
					const books = data.data.books.map(bookToText).join("\n\n---\n\n");

					return {
						content: [
							{
								type: "text",
								text: `**${author.name}**\n${data.meta.books_count} books available\n\n${books}`,
							},
						],
					};
				} catch {
					return {
						content: [{ type: "text", text: `Author not found: ${author_slug}` }],
					};
				}
			},
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/mcp" || url.pathname === "/mcp/") {
			return (BooksMandalaAgentMCP as any).serve("/mcp").fetch(request, env, ctx);
		}

		// Redirect root to a simple info page
		if (url.pathname === "/" || url.pathname === "") {
			return new Response(
				JSON.stringify({
					name: "Books Mandala Agent MCP",
					description:
						"MCP server for AI agents to search, browse, and discover books from Nepal's leading online bookstore.",
					mcp_endpoint: `${url.origin}/mcp`,
					website: "https://booksmandala.com",
					tools: [
						"search_books",
						"get_book",
						"list_genres",
						"browse_genre",
						"bestsellers",
						"new_arrivals",
						"get_author",
					],
				}),
				{
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		return new Response("Not found", { status: 404 });
	},
};
