# eUpdate für GitHub Pages

| Adresse | HTML | Seitenspezifisches JavaScript |
| --- | --- | --- |
| `eupdategaming.com/ranking` | `ranking/index.html` | `assets/ranking.js` |
| `eupdategaming.com/Bauen` | `Bauen/index.html` | `assets/bauen.js` |
| `eupdategaming.com/Einstellungen` | `Einstellungen/index.html` | `assets/einstellungen.js` |
| `eupdategaming.com/Creator` | `Creator/index.html` | Weiterleitung zum Ranking mit „Nur Streamer“ |
| `eupdategaming.com/News` | `News/index.html` | `assets/news.js` |
| `eupdategaming.com/Aufsaetze` | `Aufsaetze/index.html` | `assets/aufsaetze.js` |
| `eupdategaming.com/Loadout?id=…` | `Loadout/index.html` | `assets/loadout.js` |
| `eupdategaming.com/eupdate-admin.html` | `eupdate-admin.html` | In der Admin-Datei |

Die Seite unter `/` führt zum Ranking. Alte Links wie `/#builder` oder `/#events` führen zur passenden Unterseite. Im Ranking lassen sich Beiträge von Streamern nach Name, Waffe, Modus und Waffen-Season filtern.

Den Inhalt jeder Ansicht findest du im `section`-Element der zugehörigen HTML-Datei. Das gemeinsame Styling steht in `assets/eupdate.css`. Die Ordner unter `assets` und die Dateinamen sind Teil der Website. Die App verwendet weiterhin den vorhandenen Community-Server und dieselben Schlüssel für die im Browser gespeicherten Daten.

## Auf GitHub Pages veröffentlichen

1. Veröffentliche die mitgelieferte Worker-Datei im bestehenden Cloudflare Worker. Der Worker verwendet die vorhandene D1-Verbindung `DB` und legt die neuen Tabellen beim ersten Zugriff an.
2. Entpacke das Website-Paket. Lege seinen Inhalt inklusive `.nojekyll` und `CNAME` in den für GitHub Pages ausgewählten Veröffentlichungsordner.
3. Öffne nach der Veröffentlichung die Adressen aus der Tabelle. Die Groß- und Kleinschreibung der Ordner gehört zur Adresse.

Unter **Katalog → MW4-Einstellungen** lassen sich Kategorien und öffentliche Einstellungen pflegen. **Website → Werbung** erwartet Bildbanner mit 1.200 × 400 Pixeln. **Website → Controlling** zeigt Seitenaufrufe, Herkunfts-Domains und verfügbare Länder ab dem Start der Erfassung.

Die Website ist statisch und braucht keinen Build-Schritt. Lokal kannst du im entpackten Ordner `python -m http.server 8000` starten und `http://localhost:8000` öffnen.
