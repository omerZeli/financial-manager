# Git Command Policy

## Rule
- The agent is **forbidden** from executing git commands that modify repository state or history. This includes, but is not limited to:
  - `git add`
  - `git commit`
  - `git push`
  - `git merge`, `git rebase`, `git reset`, `git revert`
  - `git checkout` / `git switch` (branch changes)
  - `git stash`, `git cherry-pick`, `git tag`
  - `git config`
  - any other command that stages, commits, pushes, or otherwise alters the working tree, index, branches, or remotes.

## What is allowed
- The agent may still **suggest** the exact git commands for the user to run themselves.
- Read-only inspection commands are allowed when needed for a task (e.g. `git status`, `git diff`, `git log`, `git branch --list`).

## Behavior when a git mutation is needed
- Do **not** run the command.
- Instead, tell the user which command(s) to run and let them execute them manually.
