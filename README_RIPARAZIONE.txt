MATTEO'S FINANCE V2 - RIPARAZIONE DASHBOARD

Problema individuato:
L'app.js chiamava forecasts() e goals() dentro render(), ma le due funzioni non erano presenti.
Questo generava un errore JavaScript al caricamento e lasciava completamente vuoto il contenuto dell'app, mentre la barra inferiore rimaneva visibile.

Correzione effettuata:
- ripristinate le funzioni Previsioni e Obiettivi
- ripristinate le funzioni di supporto delle previsioni
- mantenute le impostazioni avanzate: fondo iniziale + data, reset movimenti, reset previsioni, reset obiettivi e reset demo
- mantenuti i 4 asset corretti nella cartella assets
- mantenuta la dashboard con wallet e monete
- verificata la sintassi JavaScript
- verificato il render iniziale in ambiente simulato

STRUTTURA DA CARICARE NEL REPOSITORY:
index.html
styles.css
app.js
assets/
  mascot-matteo.png
  matteos-finance-logo.png
  wallet-neon.png
  coins-growth.png
