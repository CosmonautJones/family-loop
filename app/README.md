# LoopedIn Mobile Scaffold

This Expo/React Native scaffold is the main LoopedIn product surface. It splits the mobile MVP foundation into theme tokens, reusable UI primitives, sample data, screens, and a lightweight navigation shell.

## Included
- Expo app shell
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
Build and review this app as mobile-first. Web is useful for fast local preview, but iOS/Android ergonomics should decide screen hierarchy, action placement, and scope.

## Run
```bash
cd app
npm install
npm start
```

## Verify
```bash
cd app
npm test
npx expo start --web
```

If Expo reports missing SDK peer dependencies, install them with `npx expo install ...` so versions stay aligned with SDK 53.
