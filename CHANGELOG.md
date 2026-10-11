# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Also available in [Russian](CHANGELOG.ru.md).

## Unreleased

## 1.2.0 — 2026-10-11

### Added

- First-save guidance with the assigned keyboard shortcut and a link to shortcut settings; help remains available after the first save.
- Current bookmark folder and a “Saved here” marker; keyboard hints distinguish saving, moving, creating a folder, and closing without changes.
- Brief confirmation on the toolbar icon after saving.
- Recoverable loading and saving errors with a Retry button.

### Changed

- Clearer folder search and creation labels, including where a new folder will be created.
- Wider popup with keyboard selection kept visible in long folder lists.

### Fixed

- Mouse interactions with help and popup text return focus to folder search; saving errors restore focus for another attempt.
- Repeated Enter or clicks during saving cannot start another operation.
- Unsupported pages cannot create empty folders; a failed save cleans up its new empty folder or reuses it on retry.
- Closing the popup with the shortcut follows the user's assigned combination, including non-Latin keyboard layouts.

## 1.1.1 — 2026-10-11

### Changed

- Clearer store positioning: save pages to existing Chrome bookmark folders from the keyboard.
- English and Russian extension metadata and popup strings.
- English and Russian store copy, screenshots, and short demo assets in `marketing/`.

## 1.1.0 — 2026-08-27

### Added

- Toolbar icon is filled when the current page is already bookmarked, and outlined when it is not.
- Keyboard shortcut `⌘B` (macOS) / `Ctrl+B` (Windows/Linux) to show or hide the panel. If it does not bind after install, assign it at `chrome://extensions/shortcuts`.
- Link to the [Chrome Web Store listing](https://chromewebstore.google.com/detail/ekklkmikngajdgklihnnhcjmbjoefaem?utm_source=item-share-cb).
- This changelog.

### Fixed

- Icon paths in `chrome.action.setIcon`: in MV3 they resolve relative to the service worker, not the extension root.

## 1.0.1 — 2026-07-26

### Changed

- Extension name and description in the manifest for the Chrome Web Store listing.

## 1.0.0 — 2026-07-19

### Added

- Save the current tab to a chosen bookmark folder.
- Folder list sorted by last modified date, with name filtering.
- Create a new folder from the filter when there are no matches.
- Keyboard navigation: `↑` / `↓`, `Enter`, `Esc`.
- If the page is already bookmarked, move it to the selected folder.
- Light and dark theme following system settings.
