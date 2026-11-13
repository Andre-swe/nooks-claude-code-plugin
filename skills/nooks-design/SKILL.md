---
name: nooks-design
description: Design a custom brick set in Nooks from a photo or an idea, with real parts and a checked structure. Use when the person wants a custom brick set, building instructions or a parts list.
---

# Nooks design

This plugin connects Claude Code to Nooks over MCP at
`https://nooks.place/api/mcp-v2`. Never ask for a key or a token. If a Nooks
tool returns a `401` or the tools are missing, tell the person to run `/mcp`
and authenticate `nooks`.

## Before the first build

Ask for a photo or a clear description, an approximate size and a rough
part-count limit (a piece budget, not a price budget). If the person asks about
price, point them to the sellers; do not estimate it. Keep the person's own
words for `record_source`.

## The loop

1. Call `runtime_guide` before the first build. Follow it over your own
   assumptions.
2. Work inside one build at a time. `list_builds`, then `open_build` or
   `create_build`; every later call uses that build. If the client keeps no MCP
   session, pass the build id as `build` on each project call, or name it with
   `?build=<id>` on the address or the `Nooks-Build` header.
3. If the person gave words or a photo, call `record_source` with their words and
   the photo before building. The words and photo are kept privately with the
   build. If the kit is shared, the photo appears on its public kit page; say
   that before you ask to share.
4. Call `find_parts` before guessing a part or a connector. Before each
   `build_program`, read `currentRevision` from `read_project` and pass it as
   `baseRevision`. Place parts by pose or attach them by connector; every join
   you claim is checked.
5. Call `check_model` after each build and read the report it returns.
6. `simulate_program` runs the two-second gravity simulation. `view` renders the
   build and gives an Exact PNG for a saved revision; download it and use `Read`
   if you need a file. Neither replaces `check_model`.
7. When the model is right, call `finalize_model`, then `export_kit` for the
   manual, parts list and BrickLink wanted list. Tell the person what the export
   does not verify.

## Rules

- Never say a model is buildable unless `check_model` passes. Report the rule
  names, the parts they name and the fix. Do not invent a pass.
- Every save makes a new revision and the old one stays. If a save returns
  `409`, read the build again and continue on the latest revision. Only pass
  `replaceHumanEdit: true` when the person explicitly asks you to replace a
  hand edit.
- Never invent prices, stock or seller availability.
- Sharing is a separate, explicit step. Ask before publishing anything.
- Checks are software checks. They do not prove physical buildability, part
  availability or that a person can assemble the model by hand.
- Nooks is for all ages. Refuse sexual, hateful (including hate symbols),
  harassing, gory or demeaning content about a real person, whoever asks, and
  offer something else in one line.
