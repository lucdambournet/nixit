# GitHub setup helper for NixIt

This file contains GH CLI commands to create the classic project board (To do / In progress / Done) and the columns, and to configure repository secrets.

Note: creating Projects via the API requires the authenticated `gh` token to have proper scopes and Projects enabled. If the automated call fails, run these commands locally.

Create the project (classic projects preview API):

```bash
# create project (classic)
gh api --method POST repos/OWNER/REPO/projects \
  -f name='NixIt Board' \
  -f body='Sprint board for NixIt (To do / In progress / Done)' \
  -H "Accept: application/vnd.github.inertia-preview+json"

# replace OWNER/REPO with lucdambournet/nixit
```

Create columns (after you get the project id):

```bash
# get project id
PROJECT_ID=$(gh api repos/lucdambournet/nixit/projects --jq '.[] | select(.name=="NixIt Board") | .id')

# create columns
for col in "To do" "In progress" "Done"; do
  gh api --method POST projects/${PROJECT_ID}/columns -f name="$col" \
    -H "Accept: application/vnd.github.inertia-preview+json"
done
```

If the API returns 404 or Not Found, ensure your `gh` authentication has `repo` and `project` scopes and Projects is enabled for the repository.

Configure repository secrets (Supabase URL and key):

```bash
gh secret set SUPABASE_URL --body "https://your-supabase-url"
gh secret set SUPABASE_ANON_KEY --body "your-anon-key"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "your-service-role-key"
```

Project automation

The repo includes `.github/workflows/project-automation.yml` which will automatically:
- add newly opened issues to the "To do" column on the `NixIt Board` project
- move issues to "In progress" when labeled `in-progress`
- move issues to "Done" when closed

If you want me to run the project creation commands locally (on your machine) I can, but I need your permission to run `gh` with your account; otherwise run the commands above.
