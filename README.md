# Node

Reference implementation of the "External Data Network" Node specification.

## Setup

### Main

1. `git clone` this repository
1. Run `npm install` in the project root
1. Create a copy of the `.env.example` file and rename it to `.env`
1. Update the `.env` file if necessary

### The `.edn` directory

1. Create a `.edn` directory in the project root
1. Create a `jobs.ts` file in the `.edn` directory
1. Create a `registry` directory in the `.edn` directory

The `.edn` directory structure should look like this:

```sh
.
+-- .edn
|  +-- registry
|  +-- jobs.ts
```

### The `jobs.ts` file

Copy the following code into your `jobs.ts` file and update it with your `JobConfig`s.

```typescript
import { JobConfig } from '../src/types'

const jobs: JobConfig[] = [
  {
    // Your `JobConfig` here
  }
]

export = jobs
```

Run `npm run dev` in the project root to start the server. The server will automatically reload when file changes are detected.

## Useful Commands

```sh
# Setup
npm install

# Development
npm run dev

# Build
npm run build

# Test
npm run test

# Format
npm run format

# Lint
npm run lint

# Clean
npm run clean
```
