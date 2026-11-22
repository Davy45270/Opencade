# No workflow here, on purpose

The local forge runs the first workflow folder it finds: `.forgejo/workflows`, then `.gitea/workflows`,
then `.github/workflows`. This folder exists so that it never runs `.github/workflows`, which belong to the
GitHub repository. The CI of this repository on the local forge is Woodpecker (`.woodpecker/`).
