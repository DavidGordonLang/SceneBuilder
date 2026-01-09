# SceneBuilder — Foundation

## Product intent
SceneBuilder is a premium, mobile-first planning and reflection tool for people in consensual power exchange dynamics.

It focuses on:
- Intentional scene design
- Safety and clarity
- Mutual trust
- Reflection and growth over time

This is not fantasy generation. It is structured, consensual, real-world planning and journaling.

---

## MVP scope (LOCKED)

### Included in v0.1
- Google authentication (Supabase Auth)
- Tool Vault (global catalogue)
- ToolDrawer (Owned + Craving)
- Scene planning and lifecycle:
  - Draft → Planned → In Progress → Completed
- Participants (single user, multiple partners)
- Scene tools selection
- Aftercare presets
- Journal entries (Planning + Reflection)
- Scene history and filtering
- Strict per-user privacy via RLS

### Explicitly deferred (NOT MVP)
- Scene sharing / collaborators
- Partner co-editing
- AI journaling assistant
- Audio, images, playlists
- Affiliate links
- Apple / email auth
- Analytics or gamification

Deferred features must not be partially implemented in MVP.

---

## Navigation model (mobile-first)

Primary tabs:
1. Scenes (default)
2. Tools
3. Journal

Scenes:
- Scene list
- New Scene (single flow, sectioned)
- Scene detail
- Scene run mode (timer + optional step cards)

Tools:
- ToolDrawer (Owned / Craving)
- Tool Vault (browse all tools)
- Custom tools

Journal:
- Timeline view
- Scene-linked Planning and Reflection entries

---

## Backend architecture

Platform:
- Supabase (Auth, Postgres, RLS)

Tables:
- profiles
- tools_global
- tools_user
- participants
- scenes
- scene_participants
- scene_tools
- aftercare_profiles
- journal_entries

Key principles:
- Single-user ownership in MVP
- tools_global is read-only for users
- tools_user represents ownership or craving state
- Scene tools reference tools_user (not tools_global)
- Participants are reusable per user
- Journal entries are always tied to a scene

RLS:
- Enabled on all tables
- Access controlled via auth.uid()
- Join tables scoped via parent scene ownership

---

## Future-safe decisions (INTENTIONAL)
- Scenes designed to allow collaborators later
- Tools model supports affiliate products later
- Journal schema supports AI analysis later
- Scene run mode designed for optional step cards
- Multiple partners supported without account sharing

These features are acknowledged but not implemented.

---

## Working rules (IMPORTANT)

- Default: full file replacements, not snippets
- If partial edits are unavoidable:
  - Exact removal instructions
  - Exact replacement instructions
  - Clear surrounding context
- Supabase and Vercel changes are done step-by-step
- No refactors without explicit agreement
- Known regression risks must stay fixed once solved
- Manual test scripts accompany changes

This file is the anchor.  
If a decision conflicts with this file, this file wins unless explicitly updated.
