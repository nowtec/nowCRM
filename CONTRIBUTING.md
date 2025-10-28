# Contributing to nowCRM

Thanks for considering contributing to **nowCRM**!
Please review the [Developer Guide](./README.md) before contributing. It covers architecture, setup, and service interactions.

<br>

## Issue Workflow

We use GitHub Issues to track bugs, enhancements, and technical improvements.
Before opening a new issue, please:

1. Check if a similar issue already exists.
2. Provide a clear title and description.
3. Include setup details, logs, or screenshots when relevant.

---

## How to Contribute

1. **Fork the Repository**
   Click **Fork** at the top of [nowCRM on GitHub](https://github.com/nowtec/nowCRM).

2. **Clone Your Fork**

   ```bash
   git clone https://github.com/yourusername/nowCRM.git
   cd nowCRM
   ```

3. **Create a Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Run the Makefile**

   ```bash
   make -f Makefile
   ```

5. **Test and Lint**

   ```bash
   pnpm lint:fix && pnpm test
   ```

6. **Commit Changes**

   ```bash
   git commit -m "feat: add message queue monitoring dashboard"
   ```

7. **Push and Open a Pull Request**

   ```bash
   git push origin feature/your-feature-name
   ```

   Then go to the main repository and open a PR.
   Before creating the PR, read and use [the Template](./PULL_REQUEST_TEMPLATE.md).

8. **Code Review**
   A maintainer will review your PR and may request small adjustments before merging.

9. **Merge**
   Once approved, your PR will be merged into the main branch.

---

## Code Guidelines

* Use **TypeScript** consistently across all services.
* Follow existing project **linting and formatting rules** (`pnpm lint:fix`).
* Never hardcode URLs, keys, or secrets — always use `.env` variables.
* Keep commits **small and descriptive**:

  ```
  feat: implement contact search filter
  fix: handle missing Redis connection gracefully
  chore: update Docker dev configuration
  docs: changes in documentation
  ```
* Run `pnpm build` before pushing for any service you changed.

---

## Reporting Bugs or Suggestions

If you find a bug or want to propose an improvement, please [create an issue](https://github.com/nowtec/nowCRM/issues/new) and describe:

* Expected vs. actual behavior.
* Steps to reproduce.
* Environment details (Node version, OS, affected service).

---

## License

By contributing, you agree that your work will be licensed under the [Apache License 2.0](./LICENSE).

