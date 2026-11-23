# eUpdate für GitHub Pages

| Adresse | HTML | Seitenspezifisches JavaScript |
| --- | --- | --- |
| `eupdategaming.com/ranking` | `ranking/index.html` | `assets/ranking.js` |
| `eupdategaming.com/Bauen` | `Bauen/index.html` | `assets/bauen.js` |
| `eupdategaming.com/Creator` | `Creator/index.html` | `assets/creator.js` |
| `eupdategaming.com/News` | `News/index.html` | `assets/news.js` |
| `eupdategaming.com/Aufsaetze` | `Aufsaetze/index.html` | `assets/aufsaetze.js` |
| `eupdategaming.com/Loadout?id=…` | `Loadout/index.html` | `assets/loadout.js` |
| `eupdategaming.com/eupdate-admin.html` | `eupdate-admin.html` | In der Admin-Datei |

Die Seite unter `/` führt zum Ranking. Auch alte Links wie `/#builder` oder `/#events` führen zur passenden Unterseite. Die im Menü angezeigte Bezeichnung „Streamer“ gehört zur Adresse `/Creator`.

Den Inhalt jeder Ansicht findest du im `section`-Element der zugehörigen HTML-Datei. Das gemeinsame Styling steht in `assets/eupdate.css`. Die Ordner unter `assets` und die Dateinamen sind Teil der Website. Die App verwendet weiterhin den vorhandenen Community-Server und dieselben Schlüssel für die im Browser gespeicherten Daten.

## Auf GitHub Pages veröffentlichen

1. Entpacke die ZIP-Datei. Lege ihren Inhalt inklusive `.nojekyll` und `CNAME` in den für GitHub Pages ausgewählten Veröffentlichungsordner deines Repositorys.
2. Prüfe unter **Settings → Pages** den Veröffentlichungsordner und die benutzerdefinierte Domain `eupdategaming.com`.
3. Öffne nach der Veröffentlichung die Adressen aus der Tabelle. Die Groß- und Kleinschreibung der Ordner gehört zur Adresse.

Die Website ist statisch und braucht keinen Build-Schritt. Lokal kannst du im entpackten Ordner `python -m http.server 8000` starten und `http://localhost:8000` öffnen.
