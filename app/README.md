# LoopedIn Responsive Web App

This Expo/React Native Web scaffold is the main LoopedIn product surface. It splits the mobile-first web foundation into theme tokens, reusable UI primitives, sample data, screens, and a lightweight navigation shell.

## Included
- Expo/React Native Web app shell
- typed domain models in `src/types`
- feature fixtures/selectors in `src/features`
- app-level selectors in `src/app`
- reusable primitives in `src/components`
- screen modules in `src/screens`
- lightweight navigation shell in `src/navigation`
- create-event draft flow backed by shared event feature data

## Intended next build-out
- RSVP interactions with editable state
- group switching backed by real active-group context
- event creation persistence and edit-after-save flow
- media upload/recap generation integration
- production navigation/state libraries

## Product stance
Build and review this responsive web app mobile-first. iOS Safari and Android Chrome phone-browser ergonomics should decide screen hierarchy and action placement; desktop web remains usable. Native apps, app stores, and EAS builds are future non-goals unless separately authorized.

## Run
```bash
cd app
npm install
npm run web
```

## Verify
```bash
cd app
npm test
npx expo start --web
```

If Expo reports missing SDK peer dependencies, install them with `npx expo install ...` so versions stay aligned with SDK 53.
