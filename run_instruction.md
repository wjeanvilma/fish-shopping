# Fish Shopping — Build and Run Instructions

Fully 3D fishing-to-market business sim. Governing spec: `Fish_Shopping_Full_Game_Blueprint.pdf`.

## Repository overview

| Path | Description |
|------|-------------|
| `app/` | Android shell (Kotlin, Jetpack Compose, Filament) |
| `game-core/` | Pure Kotlin simulation (no Android / Compose / Filament) |
| `web/` | Desktop and touch browsers (TypeScript, React, Three.js / WebGL 2) |
| `shared/` | Content pack, schema, parity fixtures, design tokens, 3D assets |
| `checkout-api/` | Checkout API |

Both clients load `shared/content` and `shared/assets` directly so they cannot drift.

## Prerequisites

- **JDK** compatible with the Android Gradle toolchain
- **Android SDK** / Android Studio (OpenGL ES 3.0 device or emulator for the app)
- **Node.js 18+** (web client)

```bash
java -version
node --version
```

## 1. Clone

```bash
git clone https://github.com/wjeanvilma/fishshopping.git
cd fishshopping
git checkout dev
```

## 2. Android

Open the folder in Android Studio and sync Gradle, then:

```bash
./gradlew :game-core:test          # simulation tests (fast, host JVM)
./gradlew :app:installDebug        # run on a device or emulator
```

Content validation:

```bash
./gradlew :game-core:validateContent
./gradlew :game-core:validateContent -Pcatalog
```

## 3. Web

```bash
cd web
npm install
npm test            # engine tests, including Kotlin parity fixtures
npm run dev         # http://localhost:5173
npm run build       # static site in web/dist
```

Content validation:

```bash
cd web
npm run content:validate
npm run content:catalog
```

## Controls

Joystick bottom-left on touch screens, or WASD / arrow keys; **U** opens upgrades.
Walk to the end of the pier to fish, drop fish on the teal pad left of the cutter,
collect portions from the pad on its right, stock the counter, and stand at the
counter to serve customers.

## When rules or content change

- Content edits: keep `$schema` linked, then `cd web && npm run content:validate` and `./gradlew :game-core:validateContent`
- Layout changes: `python3 shared/tools/generate_blockout.py`
- Intentional balance/rule changes: `./gradlew :game-core:test -PrecordFixtures=true`, review `shared/fixtures/starter-line.json`, then `npm test` in `web/`
- CI (`.github/workflows/ci.yml`) runs content validate + both test suites on every push/PR

## Branches

- `dev` — active development
