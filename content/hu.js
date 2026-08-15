/* Magyar tartalom a Lie-utazáshoz.
   Új nyelv hozzáadása: másold ezt a fájlt (pl. en.js), fordítsd le a szövegeket,
   írd át a `LIE_CONTENT.hu` kulcsot a nyelv kódjára, és linkeld be az index.html-ben.
   Az id-ket (expn, expsl, s5step, s5reset, s5ph, s5it, s5L) és a HTML-szerkezetet
   NE változtasd — ezekre a motor épül. Csak a látható szöveget fordítsd. */
window.LIE_CONTENT = window.LIE_CONTENT || {};
window.LIE_CONTENT.hu = {
  meta: {
    htmlLang: 'hu',
    langLabel: 'Magyar',
    flag: '🇭🇺',
    title: 'Manifold Atlas — a lapos gradienstől az SE(3) pózig'
  },
  ui: {
    stationWord: 'állomás',
    prevAria: 'Előző állomás',
    nextAria: 'Következő állomás',
    hubBackAria: 'Vissza a központba',
    langMenuLabel: 'Nyelv',
    menuLabel: 'Menü',
    controlsLabel: 'Irányítás',
    theme: { label: 'Téma', system: 'rendszer', light: 'világos', dark: 'sötét' },
    hint: ['húzd: körbenézés', 'görgő: közelítés', '← → : utazás', '↑ : központ'],
    noscript: 'Ehhez az interaktív ábrához JavaScript és WebGL kell. Kérlek, engedélyezd a böngésződben.'
  },
  hub: {
    eyebrow: 'csillagtérkép',
    branchWord: 'szektor',
    title: 'Manifold Atlas',
    intro: '<p>Üdv a fedélzeten! Egy naprendszer kering a központi referenciakeret körül, bolygóin sorban bejárható világokkal. Kezdd a <b>Geometriával</b> és az <b>Optimalizálással</b>, majd kövesd a pályákat oda, ahol találkoznak — ott bontakozik ki az igazi tanulság.</p><p>Vidd az egeret egy bolygó fölé, hogy megnézd, mit rejt, majd kattints rá: közelebb repülsz, és a holdgyűrűje körhintává rendeződik. A <b>← →</b> gombokkal tekered a következő úticélra, a kiválasztott hold ismertetője pedig itt jelenik meg. Az elöl álló holdra kattintva landolsz; a <b>↑</b> visszahoz a térképhez.</p><p>A világos gömbök már bejárhatók, a halványak még feltérképezés alatt állnak.</p>',
    hint: ['húzd: körbeforgás', 'görgő: közelítés', 'bolygóra kattints', '← → : holdgyűrű'],
    moonWord: 'úticél',
    branches: {
      geometry: { title: 'Geometria', summary: '<p>A terek, amikben a dolgok élnek — forgatások, pózok, hasonlóságok — és ahogy mozognak. Hat utazás a lapos ℝⁿ-től a Sim(3)-ig: érintőterek, exp/log, és (az SO(3)-nál) topológia. Költségfüggvény sehol.</p>',
        moons: {
          flat: { title: 'ℝⁿ — a lapos tér', summary: '<p>A lapos alapeset: a tér, amit már ismersz. Az érintőtér maga a tér, a lépés puszta összeadás, és nincs honnan kilépni.</p><p>Ez a mérce, amihez minden görbült eset mérve lesz — ezért érdemes vele kezdeni.</p>' },
          so2: { title: 'SO(2) — forgatás a síkon', summary: '<p>Az első görbült tér, de a legszelídebb: <em>kommutatív</em>. Itt még nincs body/world különbség.</p><p>Pont ez a haszna — amikor SO(3)-ban megjelenik a distinkció, tudni fogod, hogy a nem-kommutativitásból jött, nem a görbületből.</p>' },
          se2: { title: 'SE(2) — mozgás a síkon', summary: '<p>Forgatás és eltolás együtt, két dimenzióban. Az első eset, ahol a két komponens egymásba szól.</p><p>Itt derül ki, hogy a sorrend számít: elforgatni majd tolni nem ugyanaz, mint tolni majd forgatni.</p>' },
          so3: { title: 'SO(3) — forgatások 3D-ben', summary: '<p>A tér, ami az egész elméletet indokolja. Nem-kommutatív, kompakt, és a valódi alakja nem gömb, hanem ℝP³.</p><p>Itt van a lehetetlenségi tétel is: nincs globális, szingularitásmentes háromszámos koordináta — a gimbal lock nem bosszúság, hanem következmény.</p>' },
          se3: { title: 'SE(3) — a póz', summary: '<p>Forgatás + eltolás: 6 szabadsági fok, és a SLAM geometriai váza.</p><p>Tíz állomás: a póz/transzformáció kettősség, a referenciakeretek láncolása, a sorrend, a csavarmozgás, a bal Jacobi, az adjungált és az interpoláció.</p>' },
          sim3: { title: 'Sim(3) — hasonlóság', summary: '<p>A póz mellé egy hetedik szabadsági fok: a skála.</p><p>Monokuláris SLAM-ben pontosan ennyi a bizonytalanság két rekonstrukció között — egy merev mozgás és egy ismeretlen nagyítás.</p>' }
        } },
      optimization: { title: 'Optimalizálás', summary: '<p>Ahogy egy költséget minimalizálunk: gradiens-módszer, majd Gauss–Newton, majd a gyakorlati változatok. Mindez elfér a lapos ℝⁿ-ben — sokaság nem kell hozzá.</p>',
        moons: {
          gd: { title: 'Gradiens-módszer', summary: '<p>A völgy, a gradiens és az iteráció — végig lapos ℝ²-ben, zárt alakban végigszámolva.</p><p>Ez az a motor, amit a Riemann-gradiens majd a görbült SO(3)-ra emel. Előbb lássuk működni ott, ahol semmi nem bonyolítja.</p>' },
          gn: { title: 'Gauss–Newton', summary: '<p>A reziduum linearizálása, és ami belőle kiesik: <span class="m">H δ = −g</span>.</p><p>Nem recept, hanem a parabola alja. És mivel a görbületet is használja, nem csak az irányt, sokkal gyorsabb a gradiens-módszernél.</p>' },
          lm: { title: 'LM · robusztus', summary: '<p>Amikor a Gauss–Newton lépés túl bátor: csillapítás egy λ-val, ami a két módszer közt hangol.</p><p>És a robusztus kernelek — mert ha a zaj nem Gauss, akkor a négyzetösszeg nem pontatlan, hanem elvileg rossz.</p>' }
        } },
      slam: { title: 'SLAM', summary: '<p>Ahol a geometria és az optimalizálás összeér. A Riemann-gradiens és a faktorgráfok — a reziduumok és súlyaik, amikből egy SLAM-feladat felépül — itt fut össze teljes SLAM-má.</p>',
        moons: {
          riemann: { title: 'Riemann-gradiens', summary: '<p>Az első valódi ütközés: a lapos gradiens-módszer találkozik a görbült SO(3)-mal.</p><p>A kényszer, a nyers gradiens vetítése, az exp mint visszacsomagolás, és a sokaságon futó iteráció — a teljes lánc, egy ívben.</p>' },
          fg: { title: 'Faktorgráfok', summary: '<p>A mérések gráfja: változó-csúcsok és faktor-csúcsok. Nem külön formalizmus — <em>ez a MAP-becslés képe</em>.</p><p>És itt derül ki, miért oldható meg egyáltalán egy nagy feladat: a gráf ritka.</p>' },
          slam: { title: 'SLAM', summary: '<p>A teljes lánc egyben: pózok, landmarkok, hurokzárás és skála.</p><p>Minden, ami eddig külön ágon futott, itt találkozik — és kiderül, hogy a nehézségek nem összeadódnak, hanem ugyanannak a néhány állításnak a következményei.</p>' }
        } }
    }
  },
  // Lebegő 3D feliratok a jelenetben.
  labels: {
    bowl_step: 'w − α∇L',
    s2_exit: 'R + δ — kilép',
    s2_orthonormal: 'R^T R = I',
    s2_retract: 'visszahúzás: ‖·‖ = 1',
    s3_raw: 'nyers gradiens',
    s3_proj: 'vetített (tangens)',
    s3_drop: 'eldobjuk',
    s4_n_prefix: 'n = ',
    s4_err: 'sugárhiba',
    s4_exp: 'exp(v)',
    s6_deg_suffix: '°',
    s6_identified: 'átellenes pontok azonosítva',
    s6_cross_prefix: 'átlépés: ',
    s6_cross_sep: ' — ',
    s6_even: 'páros',
    s6_odd: 'páratlan',
    s7_dof: 'T ∈ SE(3) — 6 DoF'
  },
  // Az "iteráció" állomás (6.) ütem-feliratai.
  s5: {
    phases: ['1/3 · érintősík', '2/3 · exp-ív', '3/3 · lépés ⊞'],
    phaseText: [
      'horgony a becslésnél — δ = 0',
      'érintősík + vetített gradiens a horgonynál',
      'a lapos lépés ívvé csomagolva — exp(δ)'
    ],
    // A gombok alatt megjelenő élő képlet, fázisonként (csak matek, nyelvfüggetlen).
    phaseMath: [
      'x ⊞ 0 = x',
      'δ = −α · P<sub>x</sub>(∇L)',
      'x ⊞ δ = x · exp(δ<sup>∧</sup>)'
    ]
  },
  cards: [
   {t:'A referenciakeret', b:'<p>Három egymásra merőleges, egységnyi hosszú tengely — ennyi egy <em>referenciakeret</em>. Minden szám, amit ebben az utazásban leírunk, valamelyik ilyen keret tengelyei mentén olvasódik le.</p><p>Egy <em>forgatás</em> az, ami az egyik keretet a másikba viszi. A jelenetben a triád éppen ezt csinálja: nem a tér mozdul, csak azt cseréljük, honnan nézzük.</p><p>Innen nő ki az egész utazás egyetlen kérdésből: <strong>hogyan lépjünk egy forgatáson egy kicsit odébb</strong> úgy, hogy az eredmény forgatás maradjon? Lapos térben ez a kérdés fel sem merül. Itt ez a nehéz rész.</p>'},
   {t:'A lapos világ', b:'<p>A megszokott recept, egyetlen bekezdésben: a paramétertér <span class="m">ℝⁿ</span>, a költség egy völgy, és a <span class="m">w − α∇L</span> lépés mindig érvényes marad — nincs honnan kilépni.</p><p>Ezt a <em>Geometry · ℝⁿ</em> és az <em>Optimization · gradiens-módszer</em> utazása építi fel részletesen. Innen egyetlen dolog kell: <strong>a gradiens ugyanabban a térben él, mint a pont.</strong> A következő állomáson pontosan ez romlik el.</p>'},
   {t:'A kényszer', b:'<p>Mi szerint deriválunk? Egy mozgás <span class="m">R(t)</span> mentén az idő szerint: <span class="m">Ṙ</span> elemenként 9 skalárderivált. A kényszert deriválva <span class="m">Ṙ<sup>⊤</sup>R + R<sup>⊤</sup>Ṙ = 0</span> — vagyis <span class="m">R<sup>⊤</sup>Ṙ</span> ferdén szimmetrikus, és a legális sebességek a felület érintőjében fekszenek.</p><p>A nyers gradiens ezt nem tudja: az <span class="m">R + δ</span> lépés (piros) oszlopai már nem egységnyiek és nem páronként merőlegesek — <span class="m">R<sup>⊤</sup>R ≠ I</span>, az eredmény nem forgatás.</p><p>A teál pont a naiv mentés: sugárirányú visszahúzás (a hosszt normalizáljuk). Vigyázat — ez a gömb-ábrán elég, de a valódi <span class="m">SO(3)</span>-ra <em>nem</em>: egy oszlop hosszát javítja, de a három oszlop <em>páronkénti merőlegességét</em> nem állítja helyre. A teljes mentés a Gram–Schmidt vagy az exp — ez utóbbi a geodetikus, „nemes” változat, ami eleve a felületen marad.</p>'},
   {t:'A vetítés — a Riemann-gradiens', b:'<p>A megoldás első fele: a pontban kifeszítjük az érintősíkot, a legjobb lapos közelítést. A forgó korall vektor a nyers gradiens — „merre nőne a hiba, ha bármerre szabadon léphetnék”. Ez általában kifelé is mutat, le a gömbről. Felbontjuk: a felületre merőleges rész (piros) tiltott irányba visz, ezt <em>eldobjuk</em>; a síkban fekvő rész (teál) az, amerre a gömbön <em>tényleg</em> léphetünk.</p><p>Miért „Riemann”? Ő ismerte fel, hogy egy görbült felületen nem kell kilépni a térbe ahhoz, hogy távolságot és szöget mérjünk — elég a felületen maradó irányokat nézni. A teál árnyék tehát a valódi „lefelé” <em>a felületen belül</em>: ezt hívjuk Riemann-gradiensnek. A piros, felfelé mutató rész csak a lapos külvilág illúziója, a gömblakónak nem létezik.</p>'},
   {t:'exp — kamatos kamat', b:'<p>A második fele: a lapos lépést vissza kell csomagolni a felületre. <span class="m">n</span> kis lépés — mindegyik a pillanatnyi érintő mentén — kamatos kamatként: <span class="m">(1 + <span class="frac"><span>v</span><span>n</span></span>)<sup>n</sup> → exp(v)</span>. Kis <span class="m">n</span>-nél a borostyán lánc kifelé feszül — a piros szaggatott a sugárhiba —, nagy <span class="m">n</span>-nél rásimul a lila ívre: a hiba másodrendű, a limeszben elhal.</p><p>És az egyezés kifejtve, a gömbön: <span class="m">exp<sub>p</sub>(v) = cos θ · p + sin θ · v̂</span>, ahol <span class="m">θ = |v|</span> — ugyanaz a cos/sin-alak, mint az Euler-képletben és a Rodrigues-formulában.</p><div class="acts" style="align-items:center"><span class="m" style="min-width:56px">n = <b id="expn" style="font-style:normal;color:var(--amber)">1</b></span><input type="range" id="expsl" min="1" max="40" value="1" style="flex:1;min-width:120px"></div>'},
   {t:'Az iteráció a sokaságon', b:'<p>A gép, ütemenként vezérelve. A színek a költség (meleg = nagy hiba), a zöld pont a minimum. A gomb három ütemben visz végig egy iteráción: érintősík és vetített gradiens → exp-ív → elmozdulás és új horgony.</p><div class="acts"><button class="act" id="s5step">1/3 · érintősík</button><button class="act" id="s5reset">Újra</button></div><div class="s5math" id="s5math"></div><div class="ro" id="s5ph">horgony a becslésnél — δ = 0</div><div class="ro">iteráció: <b id="s5it">0</b> &nbsp;·&nbsp; L = <b id="s5L">—</b></div><div class="s5foot"><button class="s5info" id="s5deltainfo" type="button" aria-expanded="false" aria-controls="s5deltabubble">Mi az a δ? <span class="ic">ⓘ</span></button><div class="bubble" id="s5deltabubble" role="dialog" aria-label="Mi az a δ" hidden><p>A lépés az érintősíkon, <em>három közönséges szám</em>: <span class="m">δ = (δ<sub>x</sub>, δ<sub>y</sub>, δ<sub>z</sub>)</span> — mennyit forduljunk az egyes tengelyek körül. A „kalap” <span class="m">δ<sup>∧</sup></span> ezt a három számot rendezi ferdén szimmetrikus mátrixba, hogy az exp be tudja fogadni:</p><p class="matline"><span>δ<sup>∧</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid"><span>0</span><span>−δ<sub>z</sub></span><span>δ<sub>y</sub></span><span>δ<sub>z</sub></span><span>0</span><span>−δ<sub>x</sub></span><span>−δ<sub>y</sub></span><span>δ<sub>x</sub></span><span>0</span></span><span class="mbracket right"></span></span></p><p>Így a <span class="m">⊞</span> teljesen konkrét: <span class="m">x ⊞ δ := x · exp(δ<sup>∧</sup>)</span> — a közönséges <span class="m">+</span> általánosítása. Lapos térben pont + vektor = pont; itt sokaságpont + érintővektor = sokaságpont. A <span class="m">δ</span> minden kör végén nullára áll: a térképet a friss becslésnél terítjük ki újra.</p></div></div>'},
   {t:'SO(3) valódi alakja', b:'<p>Egy pont a gömb belsejében = tengely·szög: az irány a forgástengely, a középponttól mért távolság a szög, a határ a 180°. Az átellenes határpontok <em>ugyanaz</em> a forgatás — azonosítva vannak, ezért „ugrik át” a vándor.</p><p>A vándor 720°-ot jár be. Az első kör (borostyán) egyszer lépi át a határt — páratlan átlépésszám: az ilyen hurok nem húzható össze. A második körrel (teál) az átlépések száma párosra vált: a páros hurok már összehúzható. Ez a <span class="m">π₁ = ℤ/2</span> tartalma — csak az átlépések paritása számít, és ez a tányér-/övtrükk matematikája: 360° csavart hagy, 720° kibomlik.</p>'},
   {t:'SE(3) — póz az időben', b:'<p>Forgatás + eltolás = póz: 6 szabadsági fok, egy mozgó referenciakeret a pályán. A <span class="m">⊞</span> ugyanez a recept, csak a tangenstér <span class="m">ℝ⁶</span>: három szög, három eltolás.</p><p>A pózok saját fejezetet kaptak: a <em>Geometry · SE(3)</em> utazása tíz állomáson viszi végig — a láncolás, a sorrend, a csavarmozgás, a bal Jacobi, az adjungált és az interpoláció.</p><p>Innen indul a SLAM: sok ilyen póz faktorokkal összekötve, és rajtuk fut az előző állomás iterációja.</p>'}
  ]
};
