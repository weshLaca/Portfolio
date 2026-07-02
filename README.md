# Portfolio — Angelo Lacatena

Sito statico (HTML/CSS/JS puro, nessun framework) pronto per essere
pubblicato con **GitHub Pages**.

## Struttura

```
index.html          → home del portfolio (hero, chi sono, progetti, percorso, contatti)
styles.css
script.js
assets/
  profile.jpg               → foto estratta dal CV
  emobicity-logo.png        → logo del progetto E-mobicity
  favicon.svg
projects/
  neon-drift/        → gioco arcade in HTML5 Canvas (demo live, funzionante)
  kairo-os/          → landing page prodotto (demo live, funzionante)
  flash-city-rush/   → mini open world (struttura/HUD pronti, motore di gioco da completare — vedi sotto)
```

Ogni progetto in `projects/` è una pagina indipendente con un link
"← Portfolio di Angelo" per tornare alla home.

## Anteprima in locale

Il modo più affidabile è avviare un piccolo server locale nella cartella
del sito (aprire il file `index.html` direttamente col doppio click di
solito funziona comunque, ma alcuni link relativi rendono meglio così):

```bash
cd nome-cartella-del-sito
python3 -m http.server 8000
# poi apri http://localhost:8000 nel browser
```

## Pubblicare su GitHub Pages

1. Crea un nuovo repository su GitHub (es. `portfolio`, oppure
   `<tuo-username>.github.io` se vuoi che il sito viva alla radice del
   tuo dominio GitHub).
2. Carica tutti i file di questa cartella nella **radice** del repository
   (non dentro una sottocartella), ad esempio:
   ```bash
   git init
   git add .
   git commit -m "Primo commit del portfolio"
   git branch -M main
   git remote add origin https://github.com/<tuo-username>/<nome-repo>.git
   git push -u origin main
   ```
3. Su GitHub vai in **Settings → Pages**, imposta la sorgente su
   `main` / `root` e salva.
4. Dopo un minuto il sito sarà online su:
   - `https://<tuo-username>.github.io/` (se il repo si chiama
     `<tuo-username>.github.io`), oppure
   - `https://<tuo-username>.github.io/<nome-repo>/`.
5. Copia quel link nel tuo CV.

## Cose da personalizzare prima di pubblicare

- **Link GitHub e LinkedIn**: nel footer di `index.html` sostituisci
  `TUO-USERNAME` e `TUO-PROFILO` con i tuoi link reali (o rimuovi i
  link se preferisci non metterli).
- **Flash City Rush**: il file `game.js` originale con la logica di
  gioco (guida, traffico, missioni) non era tra i file caricati in
  questa sessione — probabilmente sovrascritto da un secondo file con
  lo stesso nome. Ho lasciato in `projects/flash-city-rush/game.js`
  una versione "segnaposto" che mostra la mappa e l'HUD ma non è
  giocabile, per non presentare una pagina rotta. Appena mi mandi il
  file giusto lo collego al posto del segnaposto — oppure sostituiscilo
  tu direttamente, HTML e CSS sono già pronti e non vanno toccati.
- **Foto**: è quella estratta dal tuo CV (250×250px). Se ne hai una a
  risoluzione più alta puoi sostituire `assets/profile.jpg` mantenendo
  lo stesso nome.
- **Indirizzo**: nel sito ho volutamente lasciato fuori il tuo indirizzo
  di casa (c'è nel CV ma non serve su un sito pubblico); email e
  telefono restano visibili nella sezione Contatti perché già presenti
  sul tuo CV pubblico.
- **Screenshot Kairo OS**: le immagini in `projects/kairo-os/assets/`
  sono illustrazioni astratte create per questo portfolio (i file
  immagine originali del progetto non erano tra gli upload). Se hai
  screenshot reali del progetto puoi sostituirle mantenendo gli stessi
  nomi file.
