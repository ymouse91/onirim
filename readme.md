# Onirim – selainpohjainen fanisovellus (PWA)

> **TIIVISTE:** Tämä on epävirallinen, ei‑kaupallinen Onirim‑sovellus yksinpelin harjoitteluun selaimessa. Tekijänoikeudet ja tavaramerkit kuuluvat omistajilleen (Z‑Man Games/Asmodee). Tämä projekti on tarkoitettu opetustarkoituksiin ja henkilökohtaiseen käyttöön.

---

## Sisällys
- [Ominaisuudet](#ominaisuudet)
- [Pikakäyttöönotto](#pikakäyttöönotto)
- [PWA: Asennus ja offline](#pwa-asennus-ja-offline)
- [Pelin kulku (lyhyesti)](#pelin-kulku-lyhyesti)
- [Sovelluksen käyttö](#sovelluksen-käyttö)
- [Pikanäppäimet](#pikanäppäimet)
- [Tiedostorakenne](#tiedostorakenne)
- [Kehitys](#kehitys)
- [Julkaisu GitHub Pagesiin](#julkaisu-github-pagesiin)
- [Vianmääritys & välimuistit](#vianmääritys--välimuistit)
- [Tunnetut bugit ja TODO](#tunnetut-bugit-ja-todo)
- [Lisenssi & vastuuvapaus](#lisenssi--vastuuvapaus)
- [EN: Short summary](#en-short-summary)

---

## Ominaisuudet
- 100% selainpohjainen yksinpelin Onirim‑kokemus.
- **PWA**: lisää aloitusnäytölle, toimii offline‑tilassa (Service Worker).
- **Prophecy** (ennustus) ‑toiminnot käyttöliittymässä selkein nuolin.
- **Nightmare**‑tapahtumat kattavasti: discard hand, discard key, lose door, mill top 5 → limbo.
- **Limbo**: ovet/painajaiset välivarastoon, sekoitus takaisin, kun pakka loppuu.
- **Tilastot** (WIP): voitot/häviöt, kesto, nosto‑ ja polttomäärät.
- **Suomi/EN UI** (WIP): käännettävät tekstit.

## Pikakäyttöönotto

1) **Kloonaa**
```bash
git clone <tämä-repo> onirim-app
cd onirim-app
```

2) **Aja paikallisesti** (valitse jompikumpi):
```bash
# Python 3
python -m http.server 8000
# tai
npx serve -l 8000
```
Avaa: http://localhost:8000/

> ⚠️ Suora tiedostona avaaminen (file://) rikkoo PWA:n ja joitain resurssipolkuja – käytä aina pientä paikallista palvelinta.

## PWA: Asennus ja offline
- Ensimmäisellä käynnistyksellä **service worker** välimuistittaa sovelluksen.
- Asenna PWA:
  - **Chrome/Edge (Desktop):** osoiterivin oikea reuna → *Install app*.
  - **iOS Safari:** *Share* → *Add to Home Screen*.
- Päivitys: versio‑tunniste näkyy alatunnisteessa (esim. `v1.3.2`). Päivitys latautuu, kun sivu päivitetään kahdesti tai SW vaihtaa versiota.

## Pelin kulku (lyhyesti)
> Tämä ei korvaa virallista sääntökirjaa – ainoastaan muistilista.

- **Tavoite:** Avaa kaikki 8 ovea ennen pakan loppumista.
- **Nostovaihe:** Nosta pakasta kortti.
  - **Ovi:** jos viimeisin pelattu symboli + avain täsmää väriin → ovi aukeaa. Muuten ovi limboon → sekoitetaan takaisin, kun pakka loppuu.
  - **Painajainen:** suorita rangaistus (alla).
  - **Uni (aurinko/kiekko):** pelaa riviin (ei kahta samaa symbolia peräkkäin väriä kohti).
- **Prophecy (Avain‑kortilla):** katso pakan 5 ylintä, polta 1, järjestä 4.
- **Painajaisen rangaistukset (valitse yksi):**
  1. Heitä **koko käsi** (ja nosta uusi 5 korttia; *ei* ratkaista uusia painajaisia tässä vaiheessa).
  2. **Hävitä yksi avain** kädestäsi.
  3. **Sulje yksi avattu ovi** (palautuu saataville).
  4. **Mill 5**: paljasta pakan 5 ylintä; **ovet & painajaiset** limboon, muut poistoon. **Sekoita limbo** takaisin, **nosta vain 5:een asti** – älä laukaise painajaisia noston aikana.

## Sovelluksen käyttö
- **Pelaa uni**: raahaa kortti peliriville tai klikkaa/napauta korttia → *Pelaa*.
- **Prophecy**: kun avain pelataan, sovellus avaa 5 kortin näkymän. Valitse poistettava, järjestä loput nuolilla, *Vahvista*.
- **Nightmare**: sovellus näyttää 4 rangaistusvalintaa (katso yllä). Alussa, jos **kädessä on avain mutta 0 ovea avattu**, valintojen on heijastettava sääntöjä oikein (ks. Tunnetut bugit).
- **Oven avaus**: kun ehdot täyttyvät, *Avaa ovi* ‑painike aktivoituu.
- **Peru**: viimeisin syöte, jos sääntöjen puitteissa mahdollista.

## Pikanäppäimet
- `1–5` = valitse korttipaikka kädessä
- `P` = pelaa valittu
- `D` = nosta pakasta
- `R` = Peru (Undo)
- `O` = avaa ovi (jos mahdollista)
- `N` = painajaisen rangaistusvalinnat (nuolilla liiku, Enter vahvista)

> Huom. Mobiilissa UI‑napit korvaavat pikanäppäimet.

## Tiedostorakenne
```
/
├─ index.html          # Sovelluksen runko ja UI
├─ app.js              # Pelilogiikka ja tila
├─ ui.js               # Käyttöliittymä (renderointi, dialogit, hotkeys)
├─ styles.css          # Tyylit (mobiili-etu, iPad optimoinnit)
├─ sw.js               # Service Worker (cache, päivityssykli)
├─ manifest.webmanifest# PWA-manifesti & ikonit
├─ /icons/             # PWA-ikonit (512, 192, maskable)
└─ /assets/            # Äänet/grafiikat (valinnainen)
```

## Kehitys
- **Node ei ole pakollinen.** Riittää, että ajat pientä web‑palvelinta.
- Koodi on puhdasta **HTML/CSS/JS**. Jos lisäät rakennusvaiheen (Vite tms.), päivitä polut ja SW.
- **Testaus:**
  - Manuaali: peliskenaariot (ovien avaus, prophecy, nightmare kaikki valinnat, limbo‑sekoitus, pakan loppu).
  - Yksikkö (WIP): `app.test.js` – tilafunktiot (`drawUpToFive`, `millTop5`, `reshuffleLimbo`, `discardWholeHandAndRefill`).

## Julkaisu GitHub Pagesiin
1) Puske `main`/`gh-pages`:
```bash
git push origin main
```
2) Ota Pages käyttöön: **Settings → Pages → Deploy from branch** (root tai `/docs`).
3) Päivitä `sw.js` versio‑avain aina muutoksen yhteydessä, jotta päivitys leviää.

## Vianmääritys & välimuistit
**Oire:** vanha versio tai outo käytös päivityksen jälkeen.

**Korjaus:**
- **Desktop Chrome/Edge:** DevTools → *Application* → *Service Workers* → *Unregister* → *Clear storage* (rastita *Unregister service workers*, *Storage* → *Clear site data*).
- **iOS Safari (PWA):** poista kotinäytön sovellus, Asetukset → Safari → Tyhjennä historia ja sivustotiedot → asenna uudestaan.
- Lisää kehityksessä `?v=DATE` query kirjastopolkujen perään.

## Tunnetut bugit ja TODO
**Bugit**
- [ ] **Aloitusbugi:** Jos kädessä **on avain** ja **yhtään ovea ei ole avattu**, painajaisen rangaistusvaihtoehdot ovat väärin. Korjaus: näytä kaikki sallitut vaihtoehdot; aseta oletukseksi `mill5`.
- [ ] **mill5**: käytetty väärää funktiota. Korjaa switch‑case:
  - `case 'mill5': { millTop5(); reshuffleLimbo(); **drawUpToFive()**; render('Painajainen…'); return; }`
  - **Älä** kutsu `refillHand()` tässä, ettei uusi painajainen aktivoidu.
- [ ] **Refilling:** erikoistilanteissa refilling voi triggeröidä painajaisen virheellisesti.
- [ ] **Tyylit:** viimeisessä korjatussa versiossa tyylit katosivat; palauta `styles.css` sekä PWA‑ikonien polut.
- [ ] **Nosto pimeästä vs näkyvästä:** ei saa polttaa näkyvän pakan korttia, jos nosto tehdään pimeästä.

**Parannukset**
- [ ] Tilastot: pelin vaikeustasot ja voittoprosentti.
- [ ] Asetus: *Vihjeet päälle/pois* (näkyvät kelpo siirrot).
- [ ] Asetus: *Kesävariantti* ei näy/ei ole aktivoitavissa pelin ollessa käynnissä.
- [ ] Ruudunlukuystävällisyys: ARIA‑labelit ja fokusjärjestys.
- [ ] Touch‑eleet: pyyhkäisy oikea/vasen selaa käden kortteja.

## Lisenssi & vastuuvapaus
- **Koodi:** MIT (tai projektin valitsema vapaa lisenssi) – täydennä.
- **IP‑huomautus:** Onirimin nimeen, grafiikkaan ja sääntöihin liittyvät oikeudet kuuluvat oikeudenhaltijoilleen (Z‑Man Games/Asmodee). Tämä on epävirallinen faniprojekti.

---

## EN: Short summary
**Onirim (fan PWA)** for solo practice in the browser. Offline‑capable (Service Worker), prophecy UI, proper nightmare choices (discard hand, discard key, close a door, mill top 5 → limbo). Known issues: at game start with a key and zero doors, choices were wrong; `mill5` must use `drawUpToFive()` instead of `refillHand()`; styling regression; no burning a visible‑pile card when drawing from the dark deck. See *Known bugs & TODO*. Build: static HTML/CSS/JS; run a tiny local server; deploy to GitHub Pages. Clear service workers if updates don’t show.

