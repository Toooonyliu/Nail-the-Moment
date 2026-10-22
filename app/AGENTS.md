# Mobile Prototype Agent Guide

## Nail the Moment design context

- Studio is the daily home: a large 3D hand, top-right photo import and a centered circular try-on action. Save and Edit flank try-on. Editing tools and pose choices open on demand. The main navigation is Studio, Saved, Moments.
- First launch introduces the value, then guides a hand photo and animated arrival in Studio. Persist onboarding completion. Provide a replay entry in hand settings and a sample-hand fallback. The camera input uses native mobile photo capture; the photo-library option works on desktop.
- Modernize within the supplied brand: warm cream, espresso, berry and aqua; DM Sans for shared page titles and everyday UI, Fraunces for memory accents, and the existing Bricolage nail wordmark in brand contexts. Use quiet rounded surfaces and compact controls instead of repeated marketing headings or slanted page cards.
- Studio provides the poses defined under Saved and pose interaction, direct nail selection, live color/shape/length/finish changes, movable details, undo/redo, and saved editable designs. Pose changes articulate actual finger joints and the wrist, and nail details follow distal bones. Use the user's single-hand manicure references for natural silhouettes and coherent joint motion.
- Saved has My library and Explore. My library separates My try-ons (real photos of the user’s own hand) from Inspiration (uploaded or saved references), with a prominent category-specific upload button. Explore opens directly with search and the photo grid, with creator attribution. Keep prototype status in the existing prototype-information sheet. Community accounts and live publishing are outside this iteration. Editable 3D designs live in Studio drafts, accessible from the hand/profile sheet. Preserve photos, attribution, folders, editable projects and intentionally empty collections during migration.
- Moments is a separate photo diary of manicures the user wore in real life. Store a photo, local calendar date, title, optional occasion and note; offer month browsing, exact anniversary resurfacing, and palette reuse in Studio. Studio saves never automatically become worn memories. Mark bundled records as sample memories.
- Photo-to-3D reconstruction and unrestricted inspiration transfer are simulated. The sample 3D editor and local photo-palette extraction work. Explain this once in onboarding and in prototype information. Photos/designs remain browser-local. Figma is read-only for this HTML iteration unless the user asks to update it.

## Prototype Instructions

In ChatGPT Work Mode, run `sites-preview start "$PWD"`, open `http://terminal.local:4173/` in the cloud browser, and verify the rendered app and its primary interactions. Keep that preview open and tell the user to inspect it in the cloud browser; do not present the local URL as a user-facing chat link. In Codex Desktop, run the local server yourself, open the preview in the in-app browser, and provide the clickable local URL. Do not deploy to Sites unless the user explicitly asks to share, publish, or deploy. Do not give the user server-start instructions when you can run it.

Before planning or implementing any mobile-app change, read this `AGENTS.md` in full. It is the source of truth for the template's runtime and component guidance.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Editing Boundary

- Build app-specific UI in `src/Prototype.tsx` and `src/prototype.css`.
- Treat `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `src/mobile/`, `public/assets/iphone/`, `public/assets/android/`, `public/assets/status/`, `vite.config.ts`, `worker/index.js`, and `scripts/prepare-sites-build.mjs` as protected runtime files. Do not edit, replace, remove, or recreate them unless the user explicitly asks to change the mobile runtime itself. For an explicit runtime change, update the affected lock hashes only after verifying the new runtime behavior.
- Run `npm run check:runtime` before preview or handoff. If it fails, restore the protected runtime instead of weakening or bypassing the check.
- `npm run build` preserves the mobile runtime and prepares the static Cloudflare Worker output required by Sites. Before a Sites handoff, confirm `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json`, and source `.openai/hosting.json` exist, then run `npm run test:sites`. Do not replace this project with a Vinext starter.

## Runtime Contract

- Preserve the mobile device runtime unless the user's task explicitly asks otherwise. Do not replace it with a standalone page. Visual fidelity applies to app-owned content inside the device screen, not to template-owned device chrome.
- Keep `App` composed around `PhoneFrame` -> `KeyboardProvider`, with `StatusBar`, app content, `HomeIndicator`, and `KeyboardDock` mounted inside the phone frame. `StatusBar` and the iOS home indicator are overlaid device chrome. When the Android keyboard is closed, the app viewport reserves the protected navigation-bar region instead of painting behind it. When the Android keyboard is open, preserve the current full-screen keyboard layout: its asset includes the IME navigation strip and the separate black navigation bar is hidden. iOS screens continue to paint behind the home-indicator area and own their safe-area content padding.
- Preserve the `iPhone` / `Pixel 10` device picker and both calibrated device presets. The Pixel screen is `427 x 952`; its `32 x 32` camera circle and `public/assets/android/navigation-bar.svg` bottom navigation bar are protected device chrome, not app content.
- Preserve the device picker's intentionally lightweight Codex styling in the top-right corner: its trigger wrapper is borderless and transparent, its trigger sizes to content, and its right-aligned menu uses the compact 3px inset plus the specified hairline and elevation shadow layers. Keep the prototype root and default app screen white.
- Preserve `StatusBar` as live device chrome, including its platform-specific typography, source status-icon assets, and spacing. Pixel 10 uses Roboto, Android indicators, and 32px top, left, and right padding. iPhone uses its iOS indicators, system typography, and calibrated spacing. Do not hardcode screenshot times like `9:41` into the status bar, replace its real-time clock, or move status bar content into app markup unless the user explicitly asks for a fixed/mock device time.
- `PhoneFrame` owns the calibrated device frame, screen portal, device picker, camera cutout, and custom cursor. Keep device assets in `public/assets/iphone/` and `public/assets/android/`; if an asset fails to load, repair the asset path or restore the asset instead of removing the frame, keyboard, or image render.
- Use `MobileScroll` directly for simple single-screen prototypes. Use `FlowStack` for conventional multi-screen flows whose routes can own their fixed header and footer; when using it, define each route as a `FlowScreen`: `{ id, header?, headerHeight?, footer?, footerHeight?, render }`, and use `flow.push(screen)`, `flow.pop()`, and `flow.replace(screen)` from `FlowStack` render callbacks or `useFlow()` instead of introducing another router.
- Use `Carousel` for a carousel, horizontal rail, swipeable cards, image or media strip, horizontally scrollable cards, chip rail, or other horizontal collection.
- For a layered app shell—such as a persistent composer, independently presented sheet, pushed/peek sidebar, or app-wide transition—compose directly in `Prototype.tsx` rather than forcing it through `FlowStack`. Keep app-owned fixed chrome as sibling layers outside `MobileScroll`.
- When using `FlowScreen`, put route-owned fixed headers or footers in `FlowScreen.header` or `FlowScreen.footer`. Set `headerHeight` to the visible app-toolbar height; `FlowStack` adds the device's top safe-area/status-bar inset automatically. Do not include `StatusBar` or its height in the header. Set `footerHeight` to the full app-footer height. `FlowScreen.footer` is an overlay, not reserved layout space; screens using it must add their own bottom content padding such as `padding-bottom: calc(var(--flow-footer-height) + var(--mobile-safe-area-height) + 24px)` so final content can scroll above the footer while still painting behind it.
- Render only scrollable content inside `MobileScroll`; it is for content that should move with scroll and rubber-band overscroll. Keep app-owned headers, nav bars, tabs, composers, and overlays outside it. This keeps scroll physics, safe areas, keyboard insets, scrollbars, and drag click suppression active without letting content paint under fixed chrome.
- Buttons, links, cards, and images inside `MobileScroll` should still allow drag scrolling when the pointer moves beyond tap slop. Use `data-scroll-drag="ignore"` only for rare controls that must own the drag gesture themselves.
- Do not add `var(--keyboard-height)` to ordinary screen/content padding inside `MobileScroll`; the scroll viewport already shrinks above the simulated keyboard. For custom fixed composers, search bars, or toast chrome, use `useKeyboardInsets().bottomInset`. It is relative to the app viewport: Android returns `0` while the closed-keyboard viewport already reserves navigation, then returns the keyboard height while open; iOS continues to clear the home indicator while closed and ride directly above the keyboard while open. Do not pin custom bottom chrome to `bottom: 0` or only `keyboardHeight`.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for every text-entry control. A raw `input` or `textarea` disconnects focus, keyboard animation, safe-area insets, and attached surfaces.
- Use `BottomSheet` for phone-scoped sheets. Its props are `open`, `onOpenChange`, `title`, optional `description`, optional `snap`, and `children`; it renders through the phone screen portal and dismisses the keyboard before opening.

## Horizontal Carousels

- Use `Carousel` for horizontally draggable cards, images, media, chips, or other horizontal collections. Do not recreate these with `overflow-x`, custom pointer handlers, or a generic div.
- `Carousel` can be nested directly inside `MobileScroll`. It owns horizontal gestures and automatically yields vertical gestures to the parent.
- Never put `data-scroll-drag="ignore"` on or around a `Carousel`; doing so prevents vertical parent scrolling when a gesture begins inside it.
- Do not add CSS scroll snapping to `Carousel`; its runtime owns momentum and release motion.
- Use `data-scroll-drag="ignore"` only when a control must prevent parent scrolling in every drag direction.

See `src/mobile/COMPONENTS.md` for the full component and gesture contract.

## Keyboard Rule

The simulated keyboard is a separate top-layer component. Before presenting anything that behaves like iOS navigation or modal UI, dismiss it first.

Call `keyboard.hide()` before:

- pushing, popping, or replacing FlowStack routes
- opening bottom sheets, action sheets, dialogs, menus, or navigation sheets
- starting transitions where the destination should not inherit text-input focus

`FlowStack` already hides the keyboard for `push`, `pop`, and `replace`. `BottomSheet` already hides it before opening. If you add new modal/sheet/navigation primitives, follow the same rule.

When a composer, search surface, or other keyboard-attached component closes, call `keyboard.hide()` in the same event before changing that component's open state. Position attached surfaces from `useKeyboardInsets()` rather than a separate timer or visibility flag so both dismiss together.

When any text-entry control loses focus, dismiss the simulated keyboard. If the control is custom or does not use the runtime's keyboard-aware fields, handle its blur event and call `keyboard.hide()` explicitly. Keep the keyboard open only when focus is moving directly to another text-entry control that should share the same keyboard session.

## Interaction Rules

- Do not trigger buttons or inputs after a pointer has become a drag. Preserve the drag suppression behavior in `MobileScroll`.
- Do not allow native browser image/file dragging inside the phone frame. Preserve the phone-level `dragstart` suppression and non-draggable image styles so scroll drags that begin on images still scroll the prototype.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for text entry so the simulated keyboard and safe-area insets stay connected.
- Fixed phone chrome should not animate with pushed screens. Screen content can animate; the status bar, camera cutout, and preview chrome should stay put.
- Keep the keyboard below the home indicator/safe area layer in z-index, and above ordinary app UI while visible.
- Keep the home indicator as the topmost safe-area layer in the z-index above everything else in the prototype.

## Confirmed iteration decisions — 2026-10-20

- Iterate both the interactive App and the Presentation; requirements are in `../output/requirements/`.
- Moments follows the desktop handoff's polaroid carousel, timeline scrubber, overview, flip-to-Info, search and stickers. Preserve photo creation, occasion/note, anniversary resurfacing and Studio palette reuse.
- 3D retains free color, individual-nail editing and direct decoration placement. AR uses the handoff's simplified thumb controls. Explain unsupported preview effects before entry and preserve the complete source design.
- Use `Add a moment` for real-photo records and `Save design` for Studio drafts. My try-ons also includes personal, non-sample Moments photos, deduplicated by photo.
- Local demo data uses a separate `demo-v2` storage key with `?demo=1`; ordinary user data remains under its existing key. Preview entry states use `screen=studio`, `screen=moments`, or `screen=saved`.

## UX audit decisions — 2026-10-21

- Ground UX changes in observed tasks plus Norman/NNg, Apple HIG and WCAG primary sources. The audit and vetted Vercel web-design-guidelines workflows are documented in `../output/ux-audit/`; do not represent heuristic review as certification or user research.
- Preserve the polaroid and thumb-arc interactions while providing visible tap and keyboard alternatives. Keep AR session changes explicit on exit.
- MobileScroll already reserves the keyboard inset. App containers must not subtract that inset a second time; complete button actions before keyboard dismissal can move them.
- Count real personal photos in My try-ons and saved references in Inspiration. Bundled legacy sample photos remain preserved in storage, separate from the personal gallery.

## Physical phone demo — 2026-10-21

- The user requested a prototype to try on an iPhone 16 Pro. `?phone=1` uses the real browser viewport, native keyboard and device safe areas; touch phones select it automatically. `?phone=0` retains the calibrated desktop device preview. This is an authorized runtime extension.
- Provide two clearly labelled preview links at handoff: phone mode with `phone=1`, and the desktop simulator with `phone=0`. Use a host reachable from the physical phone for its link; a computer-only loopback URL is insufficient for that entry.
- Preserve both presentations. Native phone mode omits simulated bezel, status bar, home indicator, device picker and keyboard; screen portals, scroll gestures and app features stay shared. Follow VisualViewport changes without reserving simulated keyboard space a second time.
- The Home Screen manifest opens the isolated sample demo in Studio. Camera testing uses HTTPS and an explicit user action. Data remains browser-local, with no cross-device sync or offline guarantee.

## Studio refinement — 2026-10-21

- Default Studio opens with Open (`fan`), closed editing tools, and an enlarged hand that keeps the nail tips in frame. In this non-editing state, the canvas ends 152px above the navigation/safe-area reserve so the design name clears the wrist. Keep photo import, save, try-on and editing clearly separated. Opening Edit closes and hides the pose chooser and its Reset control so they clear the editing panel; closing Edit restores their entry points. Gesture-only controls retain tap/keyboard alternatives inside Edit.
- Use the same canonical right-hand mesh, skin tone and proportions for Studio previews, onboarding and camera-off controls. Moments uses real photographs, including in the presentation. `canonical-hand.ts` maps bundled examples to render exports in `public/assets/canonical/`. Preserve original inspiration photos in Saved and every personal uploaded photo.
- Studio imports save the original to Inspiration and create an editable palette study in Studio drafts. Library inspiration uploads save references without automatically making new drafts. My try-ons accepts explicitly uploaded personal photos and actual camera captures, plus personal Moments photos. Hand-profile calibration photos remain profile data. Version 7 preserves prior uploads and projects while separating these collections.
- Moments uses a continuous native range over the time ruler; dragging the ruler moves the photo strip, and dragging photos updates its position. Keep tap arrows and keyboard navigation. Main page backgrounds use warm cream `#faf7f2`; polaroids and other raised surfaces can remain white.
- Presentation keeps the 11-card structure and reflects the current App. The 2026-10-21 Google Doc script update supersedes the earlier iframe-only direction: use actual prototype motion recordings for feature demonstrations, with a visible Try it live option for interactive models. Reuse the canonical hand and current pose system. Keep real photography for Moments and Saved, and preserve photo-import and camera-demo capability disclosures.

## Saved and pose interaction — 2026-10-21

- Keep the circular pose knob on the right side of Studio for one-handed use, 18px from the right edge at 53% of the content height, with choices expanding leftward inside the phone. Its four menu targets, in order, are Elegance (`relaxed`), Pinch (`pinch`), Poise (`poise`), and Curl (`curl`). Press to reveal the targets, drag and release on one to change the actual 3D pose. Releasing outside cancels. A tap opens the same options, with keyboard activation and Escape dismissal. Open (`fan`) is the default natural extended five-finger pose and is restored through a separate 62×44px Reset button above Pose, rather than a menu target. Reset also restores the baseline rotation and zoom while preserving the design. Curl retains its recognizable approved curled silhouette.
- Pose movement must feel relaxed rather than rigid: coordinate proximal, intermediate and distal joints with the wrist and palm, preserve distinct finger rhythms, and use a staged transition rather than moving all joints as one block. Prioritize Pinch's thumb opposition, relaxed index curve and natural spacing. Keep nails attached and avoid self-intersection. Respect reduced-motion preferences.
- Moments overview follows Gamma’s descending years and JUL–DEC / JAN–JUN groups. Provide All years plus direct year filters derived from stored dates. Preserve the continuous photo timeline and real-photo diary behavior.
- When upgrading the earliest sample-only diary containing `demo-birthday` and `demo-reset`, restore missing Gamma samples once and mark `sampleArchiveRevision`. Keep existing sample edits, personal diaries and deliberately empty diaries. This fixes older browser previews showing only 2026.

## Moments photography and quiet Studio header — 2026-10-21

- Moments is the user’s real manicure photo history. Render the stored photo directly in the carousel, year overview, search, detail and palette reuse. Keep sample photos explicitly labelled, and keep dates, notes and personal uploads intact. Original handoff photos plus two credited Unsplash photographs illustrate sample memories.
- Studio’s top-right area contains Import only. Keep Studio drafts in the hand/profile sheet and after saving a design, without a separate folder icon beside Import.

- Explore has no introductory badge, headline, descriptive paragraph or network disclaimer above search. Keep the main browsing surface compact, as requested in the screenshot feedback.

## Shared page typography and quiet guidance — 2026-10-21

- Studio, Saved and Moments use `PageHeader` with the existing `Brand` wordmark centered in an independent top row inside the phone, followed by one page title at the same baseline. Keep the logo, title and action areas clear of each other. Titles use DM Sans 700, 34px/44px, with -1.1px letter spacing; body text and controls retain DM Sans, with Fraunces reserved for memory accents. Main app backgrounds retain warm cream `#faf7f2`.
- `visual-polish.css` owns shared app spacing: a 26px horizontal gutter, a 36px logo within a separate 42px row beginning at 54px in the desktop device preview or 22px below the native phone safe area, then a 44px title row. The existing wordmark uses a .82 scale, about 109×36px. Keep a 12px gap before Saved/Moments navigation. Their segmented controls are 52px high with 44px active surfaces. Apply the phone safe area once and preserve fixed app chrome outside `MobileScroll`.
- Remove the three visible helper captions: `Drag to rotate · pinch to zoom`, `Drag the timeline to travel through your sets`, and `Swipe to browse · tap a photo for details`. Preserve the underlying gestures, accessible control descriptions, keyboard alternatives, current design name, photo dates and timeline navigation. Reclaim the removed captions' spacing without reducing touch targets.
- Use the user's BeReal screenshot as a reference for high-contrast controls, visible outlines and simple consistent icons while retaining the warm-white brand palette. `controls-eight.css` supplies 44px circular icon buttons, compact outlined edit tabs, and a floating 66px bottom nav with 54px outlined buttons and a dark selected pill. Its side inset is 16px, bottom offset is the safe area plus 10px, and the logical content reserve is 76px. Buttons press to scale .96 over 100ms and release over 180ms; reduced-motion mode removes these transforms. Keep the circular try-on action as the primary control.
- When changing default poses, the Reset/pose menu, page-title typography or button/navigation treatment, consult `../output/requirements/09-Open默认与BeReal控件.md`; its Open default, four-item menu and final visual values supersede conflicting earlier rules. `08-自然手势与双端交互.md` remains the reference for natural articulation, centered branding, interactive Presentation embeds and separate phone/desktop links.

- Edit places view reset, zoom and nail selection in one row above the visible model; keep every nail tip clear of these controls. Undo/redo remain at the left below that row. The editing canvas starts 118px below the shared title-row top.

## Script-led Presentation — 2026-10-21

- Use the user-provided Google Doc `1v8Wgj6o1axOSSV5rNa1ccgHYMPy8I9T8JnsvKwZQBOg` as the presentation source. The `讲稿` tab provides the current eleven-slide narrative and on-slide English text; `Slide Story` is an earlier planning outline. Preserve the full script in speaker notes, and use `图像` for supporting scenario illustrations. Do not describe those illustrations as research evidence or observed outcomes.
- Feature pages show actual looping prototype recordings for Moments, 3D exploration, AR controls and the continuous appointment journey. Provide pause/play and optional live interaction. Only the active slide plays media or mounts an interactive iframe; pause when the document is hidden and respect reduced-motion preferences. Clearly label camera-off AR control demonstrations.
- Presentation begins with the appointment scenario, explains expression and rediscovery, introduces the product, documents scope reduction, then follows Moments, 3D, AR, the connected journey, communication and the product point of view. Keep the short on-slide copy and full script distinct.

## Supplied slide 8 recording — 2026-10-21

- Keep slide 6 unchanged. Slide 8 retains the original AR heading and script and uses the user’s real-hand AR recording (`32be608c60d83aefb2de805a73efb135.mp4`), cropped to remove browser controls. Deliver an animated GIF with the full sequence. Try it live opens the current AR prototype. Use Stop/Replay for GIF playback; stop it on inactive slides and hidden documents, and respect reduced motion.
