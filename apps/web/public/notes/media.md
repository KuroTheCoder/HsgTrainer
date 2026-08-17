---
title: Media in notes
tags: [media, demo]
---

# Media in notes

Notes can carry YouTube videos — they render with a thumbnail and play inline, just like in Obsidian. Three syntaxes work:

1. An embed: `![[https://www.youtube.com/watch?v=dQw4w9WgXcQ]]`:

![[https://www.youtube.com/watch?v=dQw4w9WgXcQ]]

2. A bare link pasted into the text: https://youtu.be/dQw4w9WgXcQ

3. A markdown link with a title: [watch the video](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

> [!question] Custom callout types
> Unknown callout types from the vault (like this `[!question]`) render with the
> standard callout styling instead of breaking. Anything you style in Obsidian
> keeps working here in degraded-but-readable form.

> [!tip] Privacy
> Videos load through youtube-nocookie.com with lazy loading, so nothing plays
> until you click, and the player sets no tracking cookies.