# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-04-02] Validate large UI files before moving on**
   Do instead: run targeted tests or a build after touching page-level React components with many conditionals and modals.

## Shell & Command Reliability
1. **[2026-04-02] Directory creation may be sandbox-restricted**
   Do instead: try `apply_patch` first and request escalation for `New-Item` only when new folders are truly required.
2. **[2026-04-02] `rg` is unreliable in this workspace**
   Do instead: fall back to PowerShell `Get-Content`, `Select-String`, and numbered line dumps for precise edits.

## Domain Behavior Guardrails
1. **[2026-04-02] Performance pages must survive incomplete employee data**
   Do instead: default missing functional fields and metrics to neutral values so score, filters and tabs still render.

## User Directives
1. **[2026-04-02] Preserve unrelated dirty worktree changes**
   Do instead: avoid reverting pre-existing edits unless the task explicitly requires touching the same area.
