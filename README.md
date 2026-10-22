# Nail the Moment

The complete interactive prototype and presentation, published independently from this repository.

- [Open the website](https://toooonyliu.github.io/Nail-the-Moment/)
- [Try on your phone](https://toooonyliu.github.io/Nail-the-Moment/?phone=1&demo=1&screen=studio)
- [Desktop phone simulator](https://toooonyliu.github.io/Nail-the-Moment/?phone=0&demo=1&screen=studio)
- [Presentation](https://toooonyliu.github.io/Nail-the-Moment/presentation/)
- [Slide 8: real-hand AR demo](https://toooonyliu.github.io/Nail-the-Moment/presentation/?slide=8)

Studio includes the articulated 3D hand, pose selection, nail editing and design drafts. Saved includes personal try-ons and inspiration. Moments is a real-photo manicure diary with a timeline, browsing, search and details. The eleven-slide presentation includes looping recordings and optional live prototype interaction.

This release preserves App v8 and Presentation v11. Slide 6 is unchanged; slide 8 uses the supplied AR recording as a cropped GIF. All fonts, photos, hand models, AR assets and presentation media are hosted with the site. The original hosted prototype is not required to run it.

## Local development

Use Node.js 22.12+ (Node.js 24 is used in GitHub Actions).

```sh
npm ci --prefix app
npm --prefix app run dev
```

For the GitHub Pages build:

```sh
npm run build
npm test
```

The output is `dist/`. Deploy it under `/Nail-the-Moment/`. To use a different URL prefix, set `PAGES_BASE_PATH` when building, for example `PAGES_BASE_PATH=/ npm run build` for a custom domain root.

## Publishing

GitHub Pages uses the **GitHub Actions** publishing source. Each push to `main` runs `.github/workflows/pages.yml`: install the locked dependencies, verify the mobile runtime, build, validate local asset references, and publish the output. There are no personal deployment keys in this repository.

`app/` contains the application source and bundled media. `scripts/` adapts generated URLs for GitHub Pages; the protected mobile runtime and application UI are preserved. The former host's deployment identity is excluded.

## Prototype scope and data

Uploads, saved designs and memories are stored in each visitor's browser. They do not sync across devices or across the original and GitHub-hosted sites. Phone camera access requires HTTPS and the visitor's permission. Community browsing is a prototype; accounts and live publishing are not connected. Photo-to-3D reconstruction and full inspiration transfer remain simulated. The current live AR prototype and the supplied slide 8 recording are separate demonstrations.

The source snapshot is recorded in `SOURCE.json`. Attribution and third-party licenses remain alongside their assets in `app/public/`.

