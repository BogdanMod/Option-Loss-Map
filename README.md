# Option Loss Map (Demo)

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Open `http://localhost:3000/map` to view the demo screen.

## Theme
- Theme is system-first on first load.
- User choice is stored in `localStorage` under `olm-theme`.
- Theme logic lives in `src/lib/theme`.

## i18n
- Russian strings live in `src/lib/i18n/ru.ts`.
- `t(key)` helper and types are in `src/lib/i18n/index.ts`.
- Add new UI strings by extending `ru.ts` and using `t('key')` in UI components.
