# Homebrew Cask distribution

Mycel Console is distributed to macOS users as a Tauri DMG attached to a GitHub Release and installable through the MycelDB Homebrew tap.

## User install command

```sh
brew install --cask myceldb/tap/mycel-console
```

Homebrew maps `myceldb/tap` to the GitHub repository `MycelDB/homebrew-tap`.

## Release assets

The `Release macOS DMGs` GitHub Actions workflow runs only when a `v*` tag is pushed to `MycelDB/mycel-console`. It builds both macOS architectures and uploads stable asset names to the matching GitHub Release:

```text
mycel-console_<version>_aarch64.dmg
mycel-console_<version>_aarch64.dmg.sha256
mycel-console_<version>_x86_64.dmg
mycel-console_<version>_x86_64.dmg.sha256
```

Example for `v0.9.0`:

```text
mycel-console_0.9.0_aarch64.dmg
mycel-console_0.9.0_x86_64.dmg
```

## Tagging flow

1. Ensure `mycel-console` and `mycel-rust-sdk` have compatible release tags. The release workflow checks out `mycel-rust-sdk` at the same tag name as the console release.
2. Push a console tag:

   ```sh
   git checkout main
   git pull --ff-only origin main
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

3. Wait for the `Release macOS DMGs` workflow to complete.
4. Copy SHA-256 values from the uploaded `.sha256` assets or compute them locally:

   ```sh
   shasum -a 256 mycel-console_X.Y.Z_aarch64.dmg
   shasum -a 256 mycel-console_X.Y.Z_x86_64.dmg
   ```

5. Update `MycelDB/homebrew-tap/Casks/mycel-console.rb` with the new version and checksums.
6. Validate the cask:

   ```sh
   brew audit --cask --online myceldb/tap/mycel-console
   brew install --cask myceldb/tap/mycel-console
   ```

## Initial unsigned build note

The first distribution tranche intentionally publishes unsigned and unnotarized DMGs. macOS Gatekeeper may warn users that the app cannot be verified or is from an unidentified developer.

Future release work should add Apple Developer ID signing, notarization, and stapling before wider production distribution.
