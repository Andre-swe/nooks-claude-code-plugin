# Connector notes

The plugin sets up the Nooks MCP server for Claude Code. This page covers the
address and profiles, sign-in, renders and selection. Setup is in the
[README](../README.md).

## Address and profiles

Canonical: `https://nooks.place/api/mcp-v2`, Streamable HTTP.

| Profile | URL | Tools |
| --- | --- | --- |
| Build (default) | `https://nooks.place/api/mcp-v2` | 59 |
| Core | `https://nooks.place/api/mcp-v2/core` | 13 |
| Full | `https://nooks.place/api/mcp-v2/full` | every tool |

The plugin uses the build profile. Core is the short authoring loop; full adds
the remaining tools. `view` and `read_workbench_context` are not on core; core
renders with `render_preview` (a blockout PNG), and `view` is the real render.

## Sign-in

OAuth 2.1 authorization code with PKCE, dynamic client registration and client ID
metadata documents. Access tokens are resource-bound and short-lived; refresh
tokens rotate.

Consent names the client. The person chooses one or more builds and allows or
denies edit access. A read-only grant can read and render but cannot save.

Every profile answers `401` without a credential and sends an OAuth
`WWW-Authenticate` challenge: discovery, not a demand for a pasted key.

### Legacy keys

Use a key only if the client cannot use OAuth:

- account: `nooks_acc_<keyId>_<secret>`
- one build: `nooks_agt_<project>_<secret>`

These are placeholders. Never put a key in a URL, a repository or a chat message.
A read-only key gets read-only tools.

## Claude Code

The plugin declares `"type": "http"` and the canonical URL. In a session, run
`/mcp`, choose `nooks`, then `Authenticate`. For a shell login, when the server
is configured at local or user scope:

```bash
claude mcp login nooks
```

Headless `claude -p` runs have no `/mcp`: sign in interactively first.

Add the server by hand if you are not using the plugin, or if you need the
`nooks` shell login. To pin the OAuth callback, add `--callback-port 8080`:

```bash
claude mcp add --transport http --callback-port 8080 nooks https://nooks.place/api/mcp-v2
claude mcp login nooks
```

Local loopback OAuth has been exercised. A repeat with a hosted Claude Code
client in production is the remaining check.

## Images

`view` renders the build. It returns an MCP image block and a `Full workbench`
link for the person; a saved revision also gets a signed `Exact PNG` link. An
unsaved program has no Exact PNG.

```bash
mkdir -p .nooks
curl -L "<Exact PNG URL>" -o .nooks/preview.png
```

Use Claude Code's `Read` tool on `.nooks/preview.png`; keep a separate file for
each revision. The signed URL needs no cookie and is temporary; do not commit it
or share it.

## Selection

`read_workbench_context` returns the person's live selection while the build is
open: part keys with type, colour and position, the selection bounds, the camera
angle and build mode. It is a live pointer, not a revision.

The person must have the build open. If the selection is empty, ask them to
select parts or name the area rather than guessing from a render. With no MCP
session, pass the build id as `build` on each project call, or name it with
`?build=<id>` on the address or the `Nooks-Build` header.

## Troubleshooting

| Symptom | What to try |
| --- | --- |
| `nooks` is not listed | Check the plugin is installed, then run `/mcp` again. |
| A tool call returns `401` | Authenticate `nooks`; the challenge is OAuth discovery. Do not paste a key. |
| No browser opens | Copy the URL from `/mcp`; for a manually added server, run `claude mcp login nooks` and follow the printed instructions. |
| A save returns `409` | The build changed. Read it again and build on the latest revision, passing its `currentRevision` as `baseRevision`. Use `replaceHumanEdit: true` only when the person asks. |
| `claude -p` cannot sign in | Sign in from an interactive session first. |

Still stuck: [hello@nooks.place](mailto:hello@nooks.place).
