# Particle Collision Simulation frontend

The frontend is a Next.js application that presents a baseball-themed simulation of particle collisions and crossed molecular beams. It also contains local lab controls and statistics views used with the companion hardware backend.

## Requirements

- Node.js
- npm

## Development

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>.

Useful routes:

- `/` — interactive simulation
- `/debug` — original local hardware diagnostics and controls
- `/stats` — saved result statistics

The simulation can render without the physical hardware stack. Hardware status and control requests will fail when the local backend is unavailable.

## Checks and production build

```bash
npm run lint
npm run build
npm start
```

## Local data

The UI stores game records in browser `localStorage` and also attempts to use the local `/api/records` route. Generated data under `frontend/data/` is ignored by Git.

## Original lab configuration

The application code is intentionally preserved from the local installation. Its backend endpoint remains machine-specific in `app/api/api.ts`; review that file before running the hardware controls. Do not commit additional private endpoints or credentials.
