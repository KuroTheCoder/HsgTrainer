# SFX assets

Drop your sound files here. The app plays `sfx/<name>.mp3` — keep these exact
filenames (any format `new Audio()` supports works, mp3 is the convention):

| File            | When it plays                                                     |
|-----------------|-------------------------------------------------------------------|
| `click.mp3`     | Any button / link / option click                                  |
| `pop.mp3`       | Small chips & swatches (theme swatches, section chips, preset chips) |
| `hover.mp3`     | Hovering interactive elements (rate-limited ~8/sec)               |
| `correct.mp3`   | Score run ≥ 80% (practice / exam results)                         |
| `complete.mp3`  | Score run 60–79% + AI writing feedback arriving                   |
| `wrong.mp3`     | Score run < 60%                                                   |
| `save.mp3`      | Saving a theme preset                                             |
| `clear.mp3`     | Deleting mistakes / removing a word                               |
| `warn.mp3`      | Mock exam countdown (5:00 and 1:00 left)                          |

Guidelines: short (<250ms) and quiet for `click`/`pop`/`hover`; `correct` and
`complete` can be a warm two-note chime; `wrong` a low soft thud (never harsh).
If a file is missing the app is simply silent for that moment — nothing breaks.

Sound is off by default (Settings → Sounds). It unlocks after the first click
(browser autoplay policy) — every trigger here is a real user gesture anyway.