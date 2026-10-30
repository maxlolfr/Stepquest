# Game Studio AI — multi-project foundation v0.2

A Node.js application for managing game projects and development missions.

## Run
Requires Node.js 20+.
```sh
cd game-studio/server
npm test
npm start
```
Open http://localhost:3000 on the same machine.

## Features
- Multiple projects (Infinite Dungeon registered by default)
- Mission creation per project
- Persistent JSON database stored at `game-studio/server/data/studio.json`
- Six visible agent roles, all explicitly marked **not connected**
- Mobile-friendly dashboard
- Automated persistence and validation tests

## Important limitations
This is a **working local management application**, not an autonomous game development system yet. There are no model API calls, autonomous code edits, GitHub writes, or production hosting. Missions are saved but not executed. The local API has no authentication and must not be exposed publicly.

## Planned
AI provider adapters, authenticated backend, task execution queue, scoped GitHub permissions, isolated tests, approval-gated pull requests, pixel-art animations.
