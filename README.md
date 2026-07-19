# Marky

**RU:** Быстрое и простое добавление страниц в избранное Chrome — с выбором папки из списка и фильтрацией.

**EN:** Fast and simple bookmarking for Chrome — pick a folder from a list with search filtering.

## Возможности / Features

- Добавление текущей вкладки в закладки одним кликом
- Список папок закладок, отсортированный по дате последнего изменения
- Фильтрация папок по названию
- Создание новой папки прямо из фильтра, если совпадений нет (в «Панели закладок»)
- Навигация с клавиатуры: `↑` / `↓`, `Enter`, `Esc`
- Если страница уже в закладках — перенос в выбранную папку
- Поддержка светлой и тёмной темы (следует системным настройкам)
- Все данные обрабатываются локально, без серверов

---

- Add the current tab to bookmarks in one click
- Bookmark folders sorted by last modified date
- Filter folders by name
- Create a new folder from the filter when no matches are found (in the Bookmarks bar)
- Keyboard navigation: `↑` / `↓`, `Enter`, `Esc`
- If the page is already bookmarked — moves it to the selected folder
- Light and dark theme support (follows system settings)
- All data is processed locally, no servers involved

## Как пользоваться / How to use

1. Откройте страницу, которую хотите сохранить
2. Нажмите на иконку Marky на панели инструментов
3. При необходимости введите часть названия папки в поле фильтра
4. Выберите папку кликом или клавишей `Enter`
5. Если нужной папки нет — введите её название целиком: появится пункт `New: …`, нажмите `Enter` или кликните по нему. Папка будет создана в «Панели закладок», а текущая страница сохранится в неё

---

1. Open the page you want to save
2. Click the Marky icon in the toolbar
3. Optionally type part of a folder name in the filter field
4. Select a folder with a click or `Enter`
5. If the folder doesn't exist — type its full name: a `New: …` option appears; press `Enter` or click it. The folder is created in the Bookmarks bar and the current page is saved there

## Разработка / Development

```bash
npm install
npm run dev
```

В Chrome откройте `chrome://extensions`, включите «Режим разработчика» и нажмите «Загрузить распакованное расширение», указав папку проекта.

### Генерация иконок

```bash
npm run generate-icons
```

Иконки создаются из `assets/icon-source.png` в `public/icons/`.

### Сборка

```bash
npm run build
```

Результат — в папке `dist/`.

### Архив для Chrome Web Store

```bash
npm run package
```

Скрипт собирает проект и создаёт `release/marky-extension.zip` — архив **содержимого** `dist/`, готовый к загрузке в [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## Privacy Policy

**Last updated:** July 19, 2026

### English

Marky («the Extension») is a Chrome browser extension that helps you save web pages to your bookmarks.

**Data collection**

The Extension does **not** collect, store, transmit, or sell any personal data. It does not use analytics, tracking, or third-party services.

**Data usage**

The Extension only accesses data necessary for its core function:

- **Bookmarks** — to read your bookmark folders, create new folders, and save or move bookmarks locally in your browser.
- **Tabs** — to read the URL and title of the current tab when you choose to save it.

All processing happens locally on your device. No information leaves your browser.

**Data sharing**

The Extension does not share any data with third parties.

**Changes**

If this policy changes, the updated version will be published in this README.

**Contact**

For questions about privacy, open an issue at [github.com/lelderbe/marky-chrome-extension](https://github.com/lelderbe/marky-chrome-extension).

---

### Русский

Marky («Расширение») — расширение для браузера Chrome, которое помогает сохранять веб-страницы в закладки.

**Сбор данных**

Расширение **не собирает**, не хранит, не передаёт и не продаёт персональные данные. Аналитика, трекинг и сторонние сервисы не используются.

**Использование данных**

Расширение обращается только к данным, необходимым для работы:

- **Закладки (bookmarks)** — чтение папок, создание новых папок и создание/перемещение закладок локально в браузере.
- **Вкладки (tabs)** — получение URL и заголовка текущей вкладки при сохранении.

Вся обработка происходит локально на вашем устройстве. Информация не покидает браузер.

**Передача данных третьим лицам**

Расширение не передаёт данные третьим лицам.

**Изменения**

При обновлении политики новая версия будет опубликована в этом README.

**Контакты**

По вопросам конфиденциальности создайте issue: [github.com/lelderbe/marky-chrome-extension](https://github.com/lelderbe/marky-chrome-extension).

## Структура проекта

```
marky-chrome-extension/
├── assets/              # Исходник иконки
├── public/icons/        # Сгенерированные иконки расширения
├── scripts/             # generate-icons.mjs, package.mjs
├── src/
│   ├── lib/             # bookmarks, folders, tabs
│   ├── popup/           # React UI
│   └── types/
├── dist/                # Сборка (gitignored)
└── release/             # ZIP-архив (gitignored)
```

## Стек

- React 19, TypeScript, Vite
- Chrome Extension Manifest V3
- Chrome APIs: `bookmarks`, `tabs`
