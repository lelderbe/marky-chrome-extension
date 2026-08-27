# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Also available in [Russian](CHANGELOG.ru.md).

## [Unreleased]

### Added

- Toolbar icon is filled when the current page is already bookmarked, and outlined when it is not.
- Link to the [Chrome Web Store listing](https://chromewebstore.google.com/detail/ekklkmikngajdgklihnnhcjmbjoefaem?utm_source=item-share-cb).
- This changelog.

### Fixed

- Icon paths in `chrome.action.setIcon`: in MV3 they resolve relative to the service worker, not the extension root.

## [1.0.1] - 2026-07-26

### Changed

- Extension name and description in the manifest for the Chrome Web Store listing.

## [1.0.0] - 2026-07-19

### Added

- Save the current tab to a chosen bookmark folder.
- Folder list sorted by last modified date, with name filtering.
- Create a new folder from the filter when there are no matches.
- Keyboard navigation: `↑` / `↓`, `Enter`, `Esc`.
- If the page is already bookmarked, move it to the selected folder.
- Light and dark theme following system settings.

[Unreleased]: https://github.com/lelderbe/marky-chrome-extension/compare/a3ec00a...HEAD
[1.0.1]: https://github.com/lelderbe/marky-chrome-extension/compare/04c9ccd...a3ec00a
[1.0.0]: https://github.com/lelderbe/marky-chrome-extension/commit/04c9ccd
