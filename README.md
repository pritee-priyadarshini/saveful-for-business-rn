# SavefulBusiness

Role-based Expo + React Native frontend for connecting restaurants with nearby charities to redistribute surplus food.

## Stack

- Expo
- React Native
- TypeScript
- React Navigation
- Modular `src/` architecture
- Mock data only, no backend

## Features

- Authentication and 3 role selection flow(restuarant with single site, multisite and charity)
- Restaurant donor dashboard, listing creation, active listing management, analytics, profile page and select our plan
- Charity discovery flow, map-style pickup UI, receiver analytics, profile 
- Shared notifications, verification, profile, and location permission UI
- Reusable cards, buttons, inputs, badges, charts, and screen wrappers

## Structure

```text
src/
  components/   reusable UI primitives
  data/         mock datasets
  navigation/   auth stack and role-based tabs
  screens/      auth, restaurant, charity, shared screens
  store/        app context and mock state
  theme/        colors, spacing, typography
  types/        domain types
```

## Run

```bash
npm install
npm start or npx expo start
```
