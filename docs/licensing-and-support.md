# AZIMUTH — Licensing and support

Housekeeping for the published application: company, contact, and license terms.

---

## 1. Company and contact

| | |
|--|--|
| **Company** | [Project8X, Inc.](https://www.project8x.com) |
| **Support / questions** | support@project8x.com |

These appear in the in-app **Help → About** dialog.

---

## 2. License and use

- **Amateur and personal use:** Free. You may use AZIMUTH for non-commercial, amateur (e.g. ham radio, hobby) and personal use at no charge.
- **For-profit / commercial use:** Use by for-profit or commercial entities may require a license. Contact **support@project8x.com** for licensing.

This summary is shown in Help → About; keep it in sync with any formal EULA or license file you add later.

---

## 3. Suggested housekeeping for a published app

| Item | Recommendation |
|------|----------------|
| **About dialog** | Done: Help → About shows company, contact, version, and license summary. |
| **Version** | Shown in About; keep `package.json` version in sync with releases. |
| **Support channel** | Single contact (e.g. support@project8x.com) for questions and licensing. |
| **License clarity** | Free for amateur/personal; commercial use requires a license (contact above). |
| **Terms / EULA** | Optional: add a short EULA or terms-of-use document for installers (e.g. NSIS/Microsoft Store) and link from About or installer. |
| **Privacy** | No telemetry; data is local only (see [security.md](security.md)). You can add a one-line “We don’t collect data” in About or a separate privacy note. |
| **Attribution** | Map data (e.g. Natural Earth) may require attribution; keep in-app or docs as needed. |
| **Updates** | Optional: document how users get updates (re-download installer, Store updates, etc.). |

---

## 4. Optional next steps

- Add **author** and **license** in `package.json` (e.g. `"author": "Project8X, Inc."`, and a custom license identifier or “Proprietary” if not open source).
- If you adopt a formal EULA, add it under `docs/` or the installer and link from About.
- For Microsoft Store: ensure Store listing and optional EULA/privacy policy URLs match this contact and license summary.
