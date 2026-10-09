# Accessibility device checklist

For ROADMAP section 4, audit layer 3. Run it on a real iPhone (Safari + VoiceOver) and a Samsung tablet (Chrome + TalkBack), then hand the results back to Claude to merge into the findings list.

**App:** https://aditiohri.github.io/emoji-mandala-creator/ (the deployed main branch)

## Setup

- **iPhone:** Settings → Accessibility → VoiceOver on (triple-click the side button toggles it). Use Safari. Swipe right/left to move, double-tap to activate, two-finger swipe up reads from the top.
- **Samsung tablet:** Settings → Accessibility → TalkBack on. Use Chrome. Swipe right/left to move, double-tap to activate. Try portrait first, then landscape for step 1.
- Reload the page before each full run. Note device, OS version and screen-reader version at the top of your notes.

## For every step, write three things

- **Said:** what it announced (rough wording is fine).
- **Stuck:** where it stuck or confused you: silence, a wrong label, lost position, a trap.
- **Done:** whether you finished the step: yes, no, or only with a workaround (say which).

## Steps

| # | Task | Things to watch for |
|---|---|---|
| 1 | **Orient.** Open the page. Swipe through everything from the top to the "Your palette" heading. | What does it say about the mandala? Is it announced at all? Are there headings or landmarks to jump by (rotor on iPhone, reading controls on TalkBack)? |
| 2 | **Build a palette.** Tap the emoji field and type or insert 2 emoji. Then try 🔍 Browse and add 1 emoji. Then try the "Quick add" grid. | Are added emoji confirmed aloud? Can you reach the Quick add emoji at all? Can you close the dialog, and where does focus land afterwards? |
| 3 | **Remove an emoji.** Delete one chip with its ×. | Is the × hard to hit? What does it announce? Where does focus go afterwards? |
| 4 | **Pick a shape.** Select each of the 5 shapes. | Does it say which is selected? Does it announce that the sliders below changed? |
| 5 | **Sliders.** For each slider (the shape's own, Rotation offset, Emoji size): adjust by swipe up/down (iPhone) or volume keys / swipe up-down (TalkBack). Then try dragging your finger on it. | Name and value spoken? (Rotation offset and Emoji size had no name in the desktop tree.) Can you land on an exact value? Does a finger drag fight with page scroll? Can you ever see the mandala while adjusting? |
| 6 | **Toggles and center.** Flip "Stagger alternate rings" (or the shape's equivalent), "Rotate emoji outward" and "Soft glow". Change Center to "Empty center". | Do they say on/off? Is the dropdown named? |
| 7 | **Reorder emoji.** Move one emoji from position 1 to position 4: first by finger drag, then with the screen reader on (double-tap-and-hold, or any other way you can find). | Any way to reorder without dragging? Is the new position announced? Does a drag across rows (when chips wrap) work? |
| 8 | **Save a palette.** Tap "Save palette". Rename it. Load it. Delete it, then Undo. | Is each result announced (the "Saved as…" note)? Where does focus land after rename and delete? |
| 9 | **Background.** Pick 2 backgrounds, then open "Custom" and add a color. | Do swatches announce name and selected state? Is the small ✕ on custom swatches reachable? |
| 10 | **Shuffle.** Tap 🎲 Shuffle twice. | Is any change announced? How do you know what you got? |
| 11 | **Export.** Tap Save / share image and finish saving (Photos on iPhone, Downloads or share on Samsung). | Are "Rendering…" / "Saved" announced? Does the share sheet open and can you operate it? Did you end up with an image? |

## Final notes (2 minutes)

- Which step was worst? Anything you could not do at all?
- On the Samsung: did dragging a slider ever scroll the page instead, or change a value by accident? (Chromium emulation showed this; I want to know if it is real.)

## Handing it back

Send results in any format (typed, dictated, photo of notes). Claude merges them with the Playwright findings into the ranked list in ROADMAP section 4.
