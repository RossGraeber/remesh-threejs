# Publishing Guide

This guide explains how to publish new versions of `remesh-threejs` to npm.

## Prerequisites

1. **npm account**: You need an npm account with publishing rights to the `remesh-threejs` package
2. **npm authentication**: Configure your npm token in GitHub secrets

## Setup npm Token in GitHub

1. Generate an npm access token:
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token" → "Classic Token"
   - Select "Automation" type
   - Copy the token

2. Add token to GitHub repository:
   - Go to your repository settings
   - Navigate to "Secrets and variables" → "Actions"
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your npm token
   - Click "Add secret"

## Publishing Process

### Automated Publishing (Recommended)

Publishing happens automatically when you create a GitHub release:

1. **Update version** in `package.json`:
   ```bash
   npm version patch   # For bug fixes (0.1.0 → 0.1.1)
   npm version minor   # For new features (0.1.0 → 0.2.0)
   npm version major   # For breaking changes (0.1.0 → 1.0.0)
   ```

2. **Push changes**:
   ```bash
   git push
   git push --tags
   ```

3. **Create GitHub Release**:
   - Go to https://github.com/RossGraeber/remesh-threejs/releases/new
   - Select the tag you just pushed (e.g., `v0.1.1`)
   - Fill in release title and description
   - Click "Publish release"

4. **Automated workflow**:
   - GitHub Actions will automatically:
     - Run all tests
     - Validate code quality
     - Build the package
     - Publish to npm

### Manual Publishing

If you need to publish manually:

1. **Login to npm**:
   ```bash
   npm login
   ```

2. **Validate package**:
   ```bash
   npm run validate
   ```
   This runs: lint → format check → type check → tests → build

3. **Publish**:
   ```bash
   npm publish --access public
   ```

## Pre-publish Checklist

Before publishing a new version:

- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md` with changes
- [ ] Run `npm run validate` successfully
- [ ] All tests pass
- [ ] Build completes without errors
- [ ] README is up to date
- [ ] Breaking changes are documented

## Version Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking API changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

## What Gets Published

Only these files/folders are included in the npm package (see `.npmignore`):

- `dist/` - Compiled JavaScript and TypeScript declarations
- `README.md` - Documentation
- `LICENSE` - License file
- `package.json` - Package metadata

Everything else is excluded to keep the package size small.

## Post-publish

After successful publishing:

1. Verify on npm: https://www.npmjs.com/package/remesh-threejs
2. Test installation in a separate project:
   ```bash
   npm install remesh-threejs@latest
   ```
3. Update GitHub release notes if needed
4. Announce the release (optional):
   - Twitter/X
   - Three.js community forums
   - GitHub discussions

## Troubleshooting

### "You do not have permission to publish"

- Ensure you're logged in: `npm whoami`
- Check you have rights to the package
- Verify your npm token is correct

### "Version already exists"

- Update the version in `package.json`
- Or use `npm version` command to auto-increment

### CI/CD fails

- Check GitHub Actions logs
- Ensure all tests pass locally: `npm run validate`
- Verify Node.js version compatibility

### Package size too large

- Check what's included: `npm pack --dry-run`
- Update `.npmignore` if needed
- Remove unnecessary files from `dist/`

## Support

For issues or questions about publishing:
- Create an issue: https://github.com/RossGraeber/remesh-threejs/issues
- Contact maintainers
