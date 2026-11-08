# sdk-react-native

## Public repository privacy gate

This is a public repository. Every pull request title and body, issue, comment,
review, commit message, branch name, changelog, release note, screenshot, log,
fixture, and test output must be safe for anyone on the internet to read.

- Never publish customer or prospect names, organization names, contact names,
  email addresses, account or session identifiers, private support details,
  private tracker keys, or links to private repositories and internal tools.
- Describe reports generically, for example "a physical-device report" or "an
  integrator", and keep the identifiable source only in the private tracker.
- Before posting or pushing, review the full text and every attached artifact.
  If any detail might identify a customer, person, account, or private system,
  stop and sanitize it first.
- Public GitHub content is permanent disclosure even when later edited. Treat
  this as a hard pre-publication gate, not a cleanup task.

## Engineering rules

- Read the relevant source and tests before editing.
- Ship the smallest change that fully solves the task.
- Keep native SDK pins single-sourced through `diditNativeSdkVersions` and run
  `src/__tests__/native-sdk-pins.test.ts` for every pin change.
- Run typecheck, lint, and tests before opening a pull request.
