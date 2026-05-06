# AGENTS.md

## Project Context

SceneBuilder is a privacy-sensitive app for planning, organising, and reflecting on consensual kink scenes and relationship dynamics.

It should remain focused on structure, consent, trust, planning, negotiation, aftercare, reflection, partner-aware context, tools/toys, preferences, and long-term personal or relational memory.

It must not be treated as a porn app, sexting app, hookup app, or erotica generator.

## Local Edit Rules

Codex may edit files locally only when explicitly asked.

Before editing, Codex must explain the intended changes and the files or areas likely to be touched.

Edits should be small, targeted patches that preserve the existing architecture and product intent.

Codex must avoid broad rewrites, speculative refactors, and unrelated cleanup unless explicitly requested.

Codex must not create commits, push branches, open pull requests, delete files, or change branches without explicit approval.

Codex must not revert user changes unless explicitly asked.

## Privacy And Safety

Treat all user data, scene data, partner data, kink preferences, journal entries, tools/toys, avatars, and Supabase configuration as sensitive.

Do not print secrets, private keys, service-role keys, tokens, or private data in responses.

Public Supabase anon keys and project URLs may be referenced when needed, but anything that appears secret must be redacted.

Prefer privacy-preserving designs and avoid features that expose partner, profile, scene, or journal data more broadly than necessary.

## Development Checks

When practical, Codex should run relevant checks after code changes, such as build, lint, type checks, or focused tests.

If checks cannot be run, Codex must say why.

After changes, Codex must summarize what changed, what was checked, and any remaining risks or follow-up work.

## Product Guardrails

Keep the app premium-feeling, private, consent-aware, and planning-oriented.

Prioritize clear structure, negotiation, aftercare, reflection, continuity, and trust.

Avoid adding explicit sexual content generation, erotic chat behavior, hookup mechanics, public discovery, gamification, or analytics unless explicitly approved and consistent with the product direction.
