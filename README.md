# Toufeeq Umar — React Portfolio

React + JavaScript (JSX) + CSS, built with Vite. No Next.js or TypeScript project configuration. Includes Home, Projects, About, Contact, the cursor-follow SVG mascot, footer alignment fixes, and the supplied CV.

## VS Code / Windows
1. Install Node.js 22.13+ (22.x) or 24.x.
2. Extract this ZIP into a NEW folder. Do not merge it with an older project containing pnpm-lock.yaml or pnpm-workspace.yaml.
3. Open the extracted toufeeq-umar-portfolio folder in VS Code.
4. Open Terminal and run:

```sh
npm install
npm run dev
```

Open the localhost URL shown in the terminal. For production:

```sh
npm run build
npm run preview
```

npm install generates package-lock.json. Commit that file along with source for reproducible subsequent installs.

## Vercel
Use framework preset Vite, install command npm install, build command npm run build, output directory dist, and Node.js 22.x or 24.x. There is no pnpm lockfile, workspace configuration or package override in this clean export.

## Edit
- src/main.jsx: page content, links, and footer-aware mascot positioning.
- src/Mascot.jsx: supplied layered SVG with separate head/eye movement.
- src/styles.css: theme and responsive styles.
- public/Toufeeq-Umar-CV.docx: original downloadable CV.

The mascot is a layered SVG, not a GLB or real 3D model. The desktop mascot meets the viewport bottom and moves above the footer as it enters view. Mobile shows it in normal page flow. Pages use hash navigation. Google Fonts has local font fallbacks. Contact actions use email/phone links; no backend is required.
