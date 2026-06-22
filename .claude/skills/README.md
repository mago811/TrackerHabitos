# Superpowers skills (vendored)

These skills are vendored from [obra/superpowers](https://github.com/obra/superpowers)
(v6.0.3, MIT License — see `LICENSE`) so they are available in every Claude Code
session for this repo, including web sessions where local plugins aren't installed.

Claude Code auto-discovers any `.claude/skills/<name>/SKILL.md` at the repo level,
so these load automatically via the `Skill` tool — no plugin install needed.

## What was adapted for repo-level use

- The `superpowers:` plugin namespace was stripped from cross-skill references
  (e.g. `superpowers:test-driven-development` → `test-driven-development`) so they
  resolve to the repo-level skill names.
- Each skill keeps its own helper `scripts/` and reference files. Dev-only tooling
  from the upstream plugin root (version bump, shell lint, codex sync) was not copied.

## Optional: SessionStart injection

Upstream superpowers ships a SessionStart hook that injects the `using-superpowers`
skill at the start of each session so Claude reaches for skills proactively. That
hook is **not included here**, because registering a hook that injects context into
future sessions is a change to the agent's startup config and should be opted into
explicitly.

The skills work fine without it — they're discovered and invoked on demand via the
`Skill` tool. If you want the proactive injection, wire up a SessionStart hook in
`.claude/settings.json` pointing at a script that prints the contents of
`skills/using-superpowers/SKILL.md` as `hookSpecificOutput.additionalContext`
(see upstream `hooks/session-start` in obra/superpowers for the reference script).

## Updating

Re-vendor from upstream with `git clone --depth 1 https://github.com/obra/superpowers`,
copy `skills/` over this directory, and re-apply the `superpowers:` namespace strip.
