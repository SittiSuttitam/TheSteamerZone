# Remote Git repository

Create a **new** empty repository on GitHub or GitLab named `TheSteamerZone` (no history from the legacy Electron project).

```bash
cd TheSteamerZone
git init -b main
git add .
git commit -m "chore: initial TheSteamerZone monorepo"
git remote add origin https://github.com/YOUR_USER/TheSteamerZone.git
git push -u origin main
```

For GitHub CLI:

```bash
gh repo create TheSteamerZone --private --source=. --remote=origin --push
```
