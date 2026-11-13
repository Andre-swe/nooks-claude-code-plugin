# Nooks plugin for Claude Code

Nooks turns a photo or an idea into a custom brick set: real bricks, a checked
structure, a digital manual, a parts list and a BrickLink wanted list.
This repository is the Claude Code plugin. It adds the Nooks remote MCP server
and one skill that teaches the build loop.

**Status:** public repository and the install path. The plugin is not listed in
Anthropic's plugin directory yet, and Anthropic has not reviewed or endorsed it.

## What it does

- Connects Claude Code to the Nooks server over MCP, with OAuth sign-in.
- Adds the `nooks-design` skill. It works inside one build: read the guide,
  record the source, find parts, build, check, simulate, view, finalize, export.
- Lets you and Claude work on the same build. You can edit in the browser
  workbench; every save adds a revision and old revisions stay.

## What is in the box

| Path | What it is |
| --- | --- |
| `.mcp.json` | The Nooks remote server (`nooks`, `"type": "http"`) |
| `.claude-plugin/plugin.json` | The plugin manifest |
| `.claude-plugin/marketplace.json` | A one-plugin marketplace for installing from this repository |
| `skills/nooks-design/SKILL.md` | The build workflow skill |
| `assets/icon.svg` | The square icon Anthropic's directory shows for the listing |
| `docs/connector.md` | Profiles, OAuth, images, selection and troubleshooting |
| `scripts/validate.mjs` | A dependency-free check used by CI |
| `LICENSE`, `SECURITY.md`, `.gitignore`, `.github/workflows/validate.yml` | Licence, security policy, local ignores and CI |

## Install

Requires Claude Code. In a terminal:

```bash
claude plugin marketplace add Andre-swe/nooks-claude-code-plugin
claude plugin install nooks@nooks
claude
```

In the Claude Code session:

1. Run `/mcp`.
2. Choose `nooks`, then `Authenticate`.
3. Finish sign-in in the browser. If a Nooks call later reports that
   authentication is needed, run `/mcp`, choose `nooks`, then `Authenticate`.

Claude Code stores the OAuth token. This repository stores no credential.

### Try one session from a clone

```bash
git clone https://github.com/Andre-swe/nooks-claude-code-plugin.git
cd nooks-claude-code-plugin
claude --plugin-dir "$(pwd)"
```

The plugin loads for that session only. Run `/mcp` and authenticate `nooks`.

## The build loop

Ask for something concrete:

```text
Build a small red tower on a 4x4 base, part by part, and check it.
```

Claude calls `runtime_guide` first, then works inside one build. If you gave a
photo or words, it calls `record_source` before building. It finds parts with
`find_parts`, builds with `build_program`, and checks with `check_model`.
`simulate_program` runs the two-second gravity simulation; `view` renders the
build. `finalize_model` finishes the model, and `export_kit` returns the manual,
parts list and BrickLink wanted list.

Before `build_program`, Claude reads `currentRevision` from `read_project` and
passes it as `baseRevision`. A `409` means someone saved in between: read again
and build on the latest. It passes `replaceHumanEdit: true` only when you ask.

## What it does not do

- It stores no credentials. It creates no build and changes nothing in your
  account until a Nooks tool is called; signing in creates the OAuth grant.
- It does not prove a model is buildable. Do not call a model buildable unless
  `check_model` passes. Even then, checks are software checks: they do not prove
  physical buildability, part availability or that a person can assemble the
  model by hand. Nooks does not sell, hold stock for, box or ship kits.
- It does not provide live prices, stock or seller availability.
- It will not design sexual, hateful (including hate symbols), harassing, gory
  or demeaning content about a real person.

## How it was tested

- `node scripts/validate.mjs` passes in CI. It checks the files the plugin
  directory checks: the manifest fields, the marketplace entry, `.mcp.json`, the
  skill's front matter, the README length, the licence, `.gitattributes`, and
  file sizes.
- The MCP server, OAuth sign-in and the design loop were exercised from Codex
  against the live Nooks server.
- `claude plugin marketplace add` has **not** been run against this repository.
  The Claude Code CLI was not installed on the machine that prepared it, so the
  first person to install this plugin is the first to run that command. If it
  fails, write to [hello@nooks.place](mailto:hello@nooks.place) with the command
  and the output.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| `nooks` is not in `/mcp` | Check the plugin is installed, then restart Claude Code and run `/mcp` again. |
| Sign-in does not open | Run `/mcp` and retry. If that fails, see [the connector notes](docs/connector.md#claude-code); the `nooks` shell login needs a server added by hand at local or user scope. |
| A Nooks call returns `401` | The server is advertising OAuth. Authenticate `nooks` in `/mcp`; do not paste a key. |
| A save returns `409` | The build changed in between. Read it again, pass its `currentRevision` as `baseRevision`, and continue from the latest revision. |
| The render does not appear in the conversation | Call `view` on a saved revision, download the `Exact PNG` and use Claude Code's `Read` tool. |
| `claude -p` cannot sign in | Headless runs have no `/mcp`. Sign in from an interactive session first. |

## More

- [Connect your agent](https://nooks.place/connect)
- [Workbench](https://nooks.place/workbench)
- [Workbench guide](https://nooks.place/workbench-guide)
- [Developer docs](https://nooks.place/developers)
- [llms.txt](https://nooks.place/llms.txt)
- [Privacy](https://nooks.place/privacy)
- [Terms](https://nooks.place/terms)
- [Connector notes](docs/connector.md)
- [Security policy](SECURITY.md)
- [Licence](LICENSE)

Support: [hello@nooks.place](mailto:hello@nooks.place)

## Licence

Apache-2.0 for the files in this repository. The hosted Nooks service, workbench
and server are proprietary and are not licensed. See [LICENSE](LICENSE) and
[NOTICE](NOTICE).

Nooks is independent and is not affiliated with, sponsored or endorsed by the
LEGO Group or Brain Flakes (Viahart). LEGO® is a trademark of the LEGO Group.
