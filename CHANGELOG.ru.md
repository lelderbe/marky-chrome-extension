# Changelog

Все заметные изменения проекта документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/),
версии следуют [Semantic Versioning](https://semver.org/lang/ru/).

Также доступен на [английском](CHANGELOG.md).

## [Unreleased]

## [1.1.0] - 2026-08-27

### Добавлено

- Индикация иконки на панели инструментов: заполненная, если текущая страница уже в закладках, и контурная, если нет.
- Горячая клавиша `⌘B` (macOS) / `Ctrl+B` (Windows/Linux), чтобы показать или скрыть панель. Если сочетание не назначилось после установки, задайте его на `chrome://extensions/shortcuts`.
- Ссылка на расширение в [интернет-магазине Chrome](https://chromewebstore.google.com/detail/ekklkmikngajdgklihnnhcjmbjoefaem?utm_source=item-share-cb).
- Этот changelog.

### Исправлено

- Пути иконок в `chrome.action.setIcon`: в MV3 они резолвятся относительно service worker, а не корня расширения.

## [1.0.1] - 2026-07-26

### Изменено

- Название и описание в манифесте для публикации в Chrome Web Store.

## [1.0.0] - 2026-07-19

### Добавлено

- Сохранение текущей вкладки в выбранную папку закладок.
- Список папок, отсортированный по дате последнего изменения, с фильтром по названию.
- Создание новой папки из фильтра, если совпадений нет.
- Навигация с клавиатуры: `↑` / `↓`, `Enter`, `Esc`.
- Если страница уже в закладках — перенос в выбранную папку.
- Светлая и тёмная тема по системным настройкам.

[Unreleased]: https://github.com/lelderbe/marky-chrome-extension/compare/release-1.1.0...HEAD
[1.1.0]: https://github.com/lelderbe/marky-chrome-extension/compare/a3ec00a...release-1.1.0
[1.0.1]: https://github.com/lelderbe/marky-chrome-extension/compare/04c9ccd...a3ec00a
[1.0.0]: https://github.com/lelderbe/marky-chrome-extension/commit/04c9ccd
