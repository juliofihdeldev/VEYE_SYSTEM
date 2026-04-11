fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios setup_certs

```sh
[bundle exec] fastlane ios setup_certs
```

LOCAL — First-time setup: install profiles from git repo (no Apple portal needed)

### ios local_build

```sh
[bundle exec] fastlane ios local_build
```

LOCAL — Build IPA only (no upload). Good for validating the build.

### ios local_beta

```sh
[bundle exec] fastlane ios local_beta
```

LOCAL — Build + upload to TestFlight

### ios local_release

```sh
[bundle exec] fastlane ios local_release
```

LOCAL — Build + upload to App Store Connect (IPA only; no review submit, no metadata/screenshots)

### ios beta

```sh
[bundle exec] fastlane ios beta
```

CI — Build + upload to TestFlight (triggered on staging)

### ios release

```sh
[bundle exec] fastlane ios release
```

CI — Build + submit to App Store (triggered on main)

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
