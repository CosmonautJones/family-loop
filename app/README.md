# LoopedIn Responsive Web App

This Expo/React Native Web app is the main LoopedIn product surface. Its phone-first family loop is backed by the shared service and Query boundaries, with durable local browser data as the default development mode.

## Included
- Expo/React Native Web app shell
- typed domain models in `src/types`
- service-backed family, event, RSVP, comment, photo, and completed-event history flows
- app-level selectors in `src/app`
- reusable primitives in `src/components`
- screen modules in `src/screens`
- lightweight navigation shell in `src/navigation`
- real trip/gathering creation, exact-event navigation, RSVP, comments, attributed URL photos, validated browser-file photos, and completed-event recaps

## Evidence boundary

Default local mode is reload-durable browser storage and supports the seeded Jones Family journey. It is not evidence of live Supabase, RLS, private object storage, multi-user synchronization, or production deployment. Those capabilities require their own authorized environment and verification gates.

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
