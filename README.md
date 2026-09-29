# PIDonlineTune

Interactive 3D PID tuning playground built with React + Vite.  
You can tune gains, edit controller code (Python/C++/JavaScript), and observe live motor telemetry and response metrics.

## Prerequisites

- Node.js 20+ (recommended)
- npm (comes with Node.js)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/realaaravdas/PIDonlineTune.git
   cd PIDonlineTune
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. (Optional) Create local environment file:
   ```bash
   cp .env.example .env
   ```
   Then update values in `.env` if your setup requires them.

## Running the app

### Development mode

```bash
npm run dev
```

The app starts on `http://localhost:3000`.

### Production build

```bash
npm run build
```

### Preview production build locally

```bash
npm run preview
```

## Useful scripts

- `npm run lint` — TypeScript type-check (no emit)
- `npm run clean` — remove build artifacts
