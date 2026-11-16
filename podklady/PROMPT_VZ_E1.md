# Prompt VZ-E1 — obrazovka: tlačítko, formulář, přepínač, karta, odstranění neodeslaného zákazníka

Společná pravidla: `PROMPT_VZ_SPOLECNE.md`. Návrh § 2a, § 6, § 8. Větev `claude/vz-e1` nad SHA od koordinace
(po E0). Odhad: 1–2 sezení. Vzhled přesně podle prototypu (snímky `podklady/vz_prototyp/snimky/v2_*`).

## Cíl

Se zapnutou funkcí a jedním zákazníkem je v aplikaci navíc jen tlačítko „+ Přidat zákazníka“. Od druhého zákazníka
se objeví přepínač v hlavičce a karta „Zákazníci zakázky“. Zákazníka, kterému nic neodešlo, jde odstranit; po
odstranění posledního je obrazovka i zakázka jako předtím.

## Krok 0

`src/ui/common.js` (hlavička: `zakaznikRow`, `aresRadek`, třída `.zak-head-col`), `src/ui/ares_ui.js`
(`aresHlavicka`, `aresPanel` — vzor panelu v hlavičce), `src/ui/zakaznici_ui.js` (našeptávač, „Vybrat z databáze“),
`src/ui/vice_sachet_ui.js` (přepínač šachet, `VS_UI`), `src/ui/seznam_ui.js` (sloupec Zákazník), dialogy `potvrd`.

## Co udělat

1. **Tlačítko** „+ Přidat zákazníka“ v popisku pole Zákazník (jen ZAP, jen kdo smí ukládat, ne u prodané zakázky,
   ne v režimu jen ke čtení). Nic jiného se s jedním zákazníkem nemění.
2. **Formulář** v hlavičce (vzor panelu ARES): zákazník přes našeptávač a databázi zákazníků, IČO s kontrolní
   číslicí, „Najít firmu v ARES“, volba „stejná varianta jako řídící“ / „vlastní varianta (kopie)“, Přidat / Zrušit.
3. **2+ zákazníků:** řádek přepínače zákazníků nad polem Zákazník (★ řídící, písmeno, „+“); pole Zákazník, Kontaktní
   osoba, IČO, tlačítka ARES a databáze pracují s **otevřeným zákazníkem** (`VZ_UI.otevreny`; čtení a zápis přes
   jedno místo — vzor `vsSyncZ`). Otevření zákazníka otevře jeho variantu. Zmrazení hlavičky (`zamekZakAttr`) platí
   pro řídícího jako dnes; pro dalšího zákazníka zatím bez zmrazení (E3/E4).
4. **Karta „Zákazníci zakázky“** pod hlavičkou na záložce Kalkulace OCK a v Přehledu cenových nabídek (jen 2+):
   řídící (přepínač — v této etapě zhasnutý, zapojí E4), zákazník + IČO, číslo nabídky (zatím bez písmene, E2),
   varianta nabídky (výběr), stav, cena bez DPH, tlačítka Náhled (otevře zákazníka a kartu CN), Vlastní varianta,
   Odstranit; Tisk CN a Prodáno zhasnuté s popiskem (E2, E4).
5. **Odstranit** s potvrzením na stránce (ne `confirm`): vypíše, co se stane s variantou (sdílená zůstává;
   vlastní neodeslaná — volba smazat s ním (výchozí) / ponechat), a že se vzhled vrátí do standardního. Řídícího
   odstranit nejde (zhasnuté s vysvětlením). Zákazník s odeslanou nabídkou: v této etapě tlačítko zhasnuté
   (odeslané nabídky po zákaznících zavádí E3).
6. **VYP + data s víc zákazníky:** karta a přepínač jen ke čtení s větou „funkce je vypnutá“, zápis odmítnut (R21).
7. Sloupec Zákazník v „Kalkulace v zakázce“: u 2+ zákazníků odvozený a jen ke čtení.
8. Zpět / Znovu a neuložené změny fungují i pro přidání a odstranění zákazníka.

## Testy

`overit_vz_zadani.mjs` (prohlížeč): VYP = báze znak po znaku; ZAP s jedním zákazníkem = báze po odečtení jednoho
tlačítka; přidat → objeví se přepínač a karta; úprava pole otevřeného zákazníka nezmění řídícího; odstranit →
stránka znak po znaku jako před přidáním; 400 / 1200 / 1920 px bez vodorovného posuvu; XSS v názvu zákazníka
(`overit_xss.mjs`). `src/test_vz_ui.js` pro čisté části. Mutace „[VZ E1]“.

## Co nedělat

Čísla s písmenem, tisk, zámek, prodej, rejstřík, Pipedrive.
