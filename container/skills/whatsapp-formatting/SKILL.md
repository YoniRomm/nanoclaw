---
name: whatsapp-formatting
description: Format messages for WhatsApp using WhatsApp markdown syntax. Use when responding to WhatsApp chats (folder starts with "whatsapp_" or JID contains whatsapp identifiers).
---

# WhatsApp Message Formatting

When responding to WhatsApp chats, use WhatsApp's specific formatting syntax instead of standard Markdown.

## How to detect WhatsApp context

Check your group folder name or workspace path:
- Folder starts with `whatsapp_`
- Or check `/workspace/group/` path for `whatsapp_` prefix
- JID ends with `@s.whatsapp.net` or `@g.us`

## Formatting reference

### Text styles

| Style         | Syntax      | Example         |
| ------------- | ----------- | --------------- |
| Bold          | `*text*`    | *bold text*     |
| Italic        | `_text_`    | _italic text_   |
| Strikethrough | `~text~`    | ~strikethrough~ |
| Monospace     | ``` `text` ``` | ```monospace``` |

### Lists

WhatsApp does not support standard markdown lists. Use plain characters like `•` or `-` for bullets.

```text
• First item
• Second item
```

### Links

WhatsApp does NOT support markdown named links like `[link text](url)`. 
You MUST provide the raw URL. If you want to describe it, do so in plain text: 

```text
Project Link: https://example.com
```

## What NOT to use

- **NO** `#` headings (use `*Bold text*` for headers instead)
- **NO** `**double asterisks**` for bold (use `*single asterisks*`)
- **NO** `[text](url)` links (use raw URLs instead)
- **NO** tables (use monospace or plain text alignment)

## Example message

```text
*Project Update*

_March 21, 2026_

• *Done:* Fixed login bug
• *Doing:* Dashboard
• *Link:* https://example.com/progress
```

## Quick rules

1. Use `*bold*` not `**bold**`
2. Never use `[text](url)` links, use raw URLs only
3. Skip headings — use bold text instead
