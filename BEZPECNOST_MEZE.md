# Známé meze zabezpečení

Soupis věcí, které aplikace **vědomě nehlídá**, nebo hlídá jen jako práh proti
omylu. Nejsou to díry, které se čekají na opravu. Jsou to meze, se kterými se
počítá, a proto mají být napsané: pojistka, která se vydává za zábranu, je
horší než žádná.

Založeno 23. 9. 2026 z revize změn v22.9.9 (nálezy B65–B68). Každá položka
říká, co pojistka dělá, co nedělá a proč to tak zůstává.

---

## B65 — pojistka zveřejnění ceníku (B55) je práh, ne zábrana

**Co dělá:** při zveřejnění ceníku server porovná tuzemský sloupec se
zahraničními odchylkami. Když se víc než pět položek shoduje se zahraniční
cenou, zveřejnění odmítne (`netlify/functions/program.mjs`,
`src/cenik_rady.js`). Chrání tak před omylem, kterým vznikl ceník v27:
zveřejněním ze zahraniční varianty.

**Co nedělá:**
- porovnává přesnou rovnost, takže cena o korunu jiná shodou není,
- položky s nezměněnou tuzemskou cenou se nepočítají,
- příchozí odchylky přebíjejí uložené.

Administrátor, který chce zveřejnit cokoli, to dokáže.

**Proč to tak zůstává:** zveřejňovat ceník smí jen administrátor. Pojistka
je proti chybě ruky, ne proti němu. Na tom, jaký ceník platí, se stejně
musí domluvit lidé.

## B66 — změnu čísla odeslané nabídky zapisuje do protokolu jen aplikace

**Co dělá:** číslo uzamčené (odeslané) nabídky smí změnit jen
administrátor. Server to vynucuje (B56) a srovná razítko v zámku. Aplikace
změnu zapíše do protokolu zakázky.

**Co nedělá:** volání API mimo aplikaci změnu provede, ale do protokolu ji
nezapíše. Stopou zůstane jen `upravil` a čas uložení.

**Proč to tak zůstává:** jde jen o administrátora a původní soubor s
původním číslem zůstává v databázi (jiné číslo = jiné jméno souboru), takže
stopa se neztratí. Kdyby bylo potřeba to doložit, zapíše to server.

## B67 — verze vzorce otisku ceníku se čte ze záznamu samotného

**Co dělá:** zveřejněný ceník nese otisk. Při načtení se ověřuje, že ho
nikdo nezměnil.

**Co nedělá:** verzi vzorce otisku (`otiskVerze`) čte ze záznamu. Kdo ručně
upraví `_program.json` a verzi přepíše, místo „otisk nesedí“ uvidí
„netknutost doložit nejde“. Varování zůstane, jen mírnější.

**Proč to tak zůstává:** týká se jen **režimu složky**, který je od
18. 8. 2026 vypnutý (`ULO_SLOZKA_POVOLENA = false`). Online ceník drží
server a upravit se dá jen zveřejněním.

## B68 — texty kapitol IV.–VI. a doložek (opraveno 23. 9. 2026)

Revize upozornila, že se texty ukládají bez kontroly typu a délky. Vykreslení
bylo bezpečné (`esc()` v aplikaci, `xmlEscRadky` ve Wordu), ale záznam firmy
se čte při každém přihlášení, takže objekt místo textu nebo obří pole by
zpomalilo všechny. Od 23. 9. 2026 `firmaLzeZverejnit` (`src/firma.js`) pustí
k zapsání jen text, číslo nebo ano/ne. Délku omezuje na 2 000 znaků, u textů
kapitol na 20 000. Stejnou kontrolou jde klient i server (`/api/firma`).

---

## Zbytkové meze uzavřených nálezů

### B61 — zámek pod jiným jménem souboru

Od 23. 9. 2026 server odmítne **nový** zámek, jehož číslo nesedí na data
zakázky nebo nemá značku `cisloPapir`. Výsledek nového zámku navíc přepočítá
(B59). Zbývá jedna mez: kdo si upraví klienta, může změnit číslo zakázky
**i** číslo v zámku tak, aby spolu seděly. Vznikne tím nová zakázka pod
novým jménem souboru, ale původní soubor s původním číslem zůstane
nedotčený, takže se stopa neztratí. Server navíc na razítko ověření napíše,
jestli čísla výsledku sedí na data.

### B62 — razítka existujícího zámku

Od 23. 9. 2026 bere server `kdo`, `popis` a `sablona` u existujícího zámku
z uložené verze. U `tisky[]` a `odemceni[]` platí uložený začátek, přidávat
se smí. Nové záznamy do `tisky[]` ale dodává klient. Server hlídá, že se nic
nepřepíše ani neubere, ne kdo dotisk provedl.
