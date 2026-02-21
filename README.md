# Books Mandala MCP

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that lets AI assistants search, browse, and discover books from [Books Mandala](https://booksmandala.com) — Nepal's largest online bookstore with 50,000+ titles.

## What It Does

Connect any MCP-compatible AI app (Claude Desktop, Cursor, Windsurf, etc.) to Books Mandala's live catalog. Your AI assistant can:

- Search books by title, author, or ISBN
- Browse 177 genres and filter by category
- Check current bestsellers and new arrivals
- Look up author profiles and their available titles

All responses include real-time prices (NPR), stock availability, and direct links back to booksmandala.com for purchasing.

## Available Tools

| Tool | Description |
|------|-------------|
| `search_books` | Search by title, author, or ISBN |
| `get_book` | Get full details for a specific book |
| `list_genres` | Browse all 177 genres |
| `browse_genre` | List books within a genre |
| `bestsellers` | Current bestselling books |
| `new_arrivals` | Books added in the last 45 days |
| `get_author` | Author profile and their catalog |

## Quick Setup

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "books-mandala": {
      "url": "https://bm-agent-mcp.booksmandala.workers.dev/mcp"
    }
  }
}
```

Restart Claude Desktop. That's it — start asking about books.

### Other MCP Clients

MCP Endpoint: `https://bm-agent-mcp.booksmandala.workers.dev/mcp`

Protocol: MCP 2025-03-26 (Streamable HTTP transport)

## REST API

This MCP is powered by the Books Mandala Agent API. If you prefer direct REST access:

- **Base URL:** `https://booksmandala.com/api/agent/v1`
- **Docs:** [API Documentation](https://booksmandala.com/agent-api)
- **Full spec:** [booksmandala.com/api/agent/v1/docs](https://booksmandala.com/api/agent/v1/docs)
- **Auth:** API key via `X-API-Key` header
- **Get a key:** Email dev@mandalatech.io

## Roadmap

This is Phase 1 (discovery and browsing). Coming next:

- **Phase 2:** Real-time stock checks, shipping estimates, price alerts
- **Phase 3:** Order placement — AI agents place orders, generate payment links, track deliveries
- **Phase 4:** Personalized recommendations, wishlists, reorder suggestions

## Built With

- [Cloudflare Workers](https://workers.cloudflare.com/) + Durable Objects
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Agents SDK](https://github.com/cloudflare/agents)

## About Books Mandala

[Books Mandala](https://booksmandala.com) is Nepal's leading online bookstore, delivering 50,000+ titles across the country since 2017. Built by [Mandala Tech](https://mandalatech.io).

## License

MIT
