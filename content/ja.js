/* 日本語コンテンツ（Lie の旅）。
   新しい言語を追加するとき: このファイルをコピーし（例: de.js）、文字列を翻訳し、
   `LIE_CONTENT.ja` のキーを言語コードに変え、index.html から読み込む。
   id（expn, expsl, s5step, s5reset, s5ph, s5it, s5L）と HTML の構造は
   変更しないこと — エンジンがそれらに依存している。訳すのは表示テキストだけ。 */
window.LIE_CONTENT = window.LIE_CONTENT || {};
window.LIE_CONTENT.ja = {
  meta: {
    htmlLang: 'ja',
    langLabel: '日本語',
    flag: '🇯🇵',
    title: 'Manifold Atlas — 平坦な勾配から SE(3) の位置姿勢まで'
  },
  ui: {
    stationWord: 'ステーション',
    prevAria: '前のステーション',
    nextAria: '次のステーション',
    hubBackAria: 'ハブに戻る',
    langMenuLabel: '言語',
    theme: { label: 'テーマ', system: 'システム', light: 'ライト', dark: 'ダーク' },
    hint: ['ドラッグ: 見回す', 'スクロール: ズーム', '← → : 移動', '↑ : ハブ'],
    noscript: 'このインタラクティブな図には JavaScript と WebGL が必要です。ブラウザで有効にしてください。'
  },
  hub: {
    eyebrow: '星図',
    branchWord: 'セクター',
    title: 'Manifold Atlas',
    intro: '<p>ようこそ。中心の座標系のまわりを一つの惑星系が回り、それぞれの惑星には順に降り立てる世界が連なっています。まずは<b>幾何</b>と<b>最適化</b>から始め、その軌道が交わる場所をたどってください — 本当の見返りはそこから始まります。</p><p>惑星にマウスを乗せると、何を抱えているかを偵察できます。番号のついた衛星が、最初に着陸すべき場所です。試作として<em>幾何</em>（ℝⁿ）と<em>最適化</em>（勾配降下法）の最初の停留点も、<em>リーマン勾配降下法</em>と並んで着陸可能です。幾何の <em>SE(3)</em> 衛星には位置姿勢の章がまるごと待っています — 地図の残りはまだ測量中です。</p>',
    hint: ['ドラッグ: 回転', 'スクロール: ズーム', '惑星にホバー · 球をクリック'],
    branches: {
      geometry: { title: '幾何', summary: '<p>ものが住む空間 — 回転、位置姿勢、相似 — と、その動き方。平坦な ℝⁿ から Sim(3) まで六つの旅: 接空間、exp/log、そして（SO(3) では）トポロジー。コスト関数はどこにも出てきません。</p>' },
      optimization: { title: '最適化', summary: '<p>コストを最小化するやり方: 勾配降下法、次に Gauss–Newton、そして実務的な変種たち。すべては平坦な ℝⁿ に収まります — 多様体は要りません。</p>' },
      slam: { title: 'SLAM', summary: '<p>幾何と最適化が出会う場所。リーマン勾配降下法（SO(3) × 勾配降下法 — 今日のページ）と因子グラフ — SLAM 問題を組み立てる残差と重み — が、ここで完全な SLAM に合流します。</p>' }
    }
  },
  // シーン内に浮かぶ 3D ラベル。
  labels: {
    bowl_step: 'w − α∇L',
    s2_exit: 'R + δ — 外れる',
    s2_orthonormal: 'R^T R = I',
    s2_retract: 'リトラクション: ‖·‖ = 1',
    s3_raw: '生の勾配',
    s3_proj: '射影後（接方向）',
    s3_drop: '捨てる',
    s4_n_prefix: 'n = ',
    s4_err: '半径方向の誤差',
    s4_exp: 'exp(v)',
    s6_deg_suffix: '°',
    s6_identified: '対蹠点は同一視',
    s6_cross_prefix: '横断: ',
    s6_cross_sep: ' — ',
    s6_even: '偶数',
    s6_odd: '奇数',
    s7_dof: 'T ∈ SE(3) — 6 自由度'
  },
  // 「反復」ステーション（6 番目）の拍ごとのキャプション。
  s5: {
    phases: ['1/3 · 接平面', '2/3 · exp の弧', '3/3 · ステップ ⊞'],
    phaseText: [
      '推定値にアンカー — δ = 0',
      'アンカーでの接平面と射影された勾配',
      '平坦なステップを弧に巻き取る — exp(δ)'
    ],
    // ボタンの下に表示される、位相ごとの生きた式（数式のみ、言語非依存）。
    phaseMath: [
      'x ⊞ 0 = x',
      'δ = −α · P<sub>x</sub>(∇L)',
      'x ⊞ δ = x · exp(δ<sup>∧</sup>)'
    ]
  },
  cards: [
   {t:'この旅', b:'<p>五回分の議論に相当する導出を、一つの空間に収めました。八つのステーション: ディープラーニングでおなじみの平坦な世界から、<span class="m">SE(3)</span> の位置姿勢まで。菫色の糸が思考の筋道で、ステーション間を飛ぶときに見えます。</p><p>操作: ← → のボタンかキー、マウスのドラッグで見回し、スクロールでズーム。</p>'},
   {t:'平坦な世界', b:'<p>おなじみのレシピ: パラメータ空間は <span class="m">ℝⁿ</span>、コストは谷、そして <span class="m">w − α∇L</span> のステップはいつでも有効なままです — 外に出て行く先がそもそもありません。勾配は点と同じ空間に住んでいます。</p><p>このレシピをそのまま曲がった世界へ持って行きたい、というのがこの旅です。</p>'},
   {t:'拘束条件', b:'<p>何に関して微分するのか。運動 <span class="m">R(t)</span> に沿って、時間で微分します: <span class="m">Ṙ</span> は成分ごとに 9 個のスカラー微分です。拘束条件を微分すると <span class="m">Ṙ<sup>⊤</sup>R + R<sup>⊤</sup>Ṙ = 0</span>、つまり <span class="m">R<sup>⊤</sup>Ṙ</span> は歪対称であり、許される速度は曲面の接方向に横たわります。</p><p>生の勾配はそんなことを知りません: <span class="m">R + δ</span> というステップ（赤）の列は、もう長さ 1 でも互いに直交でもなく、<span class="m">R<sup>⊤</sup>R ≠ I</span> なので結果は回転になりません。</p><p>青緑の点が素朴な応急処置、半径方向のリトラクション（長さを正規化する）です。ただし注意 — 球の絵にはこれで足りますが、本物の <span class="m">SO(3)</span> には<em>足りません</em>: 一本の列の長さは直りますが、三本の列の<em>相互の直交性</em>は戻りません。本式の直し方は Gram–Schmidt か exp で、後者は最初から曲面上に留まる測地線的な「正統派」のやり方です。</p>'},
   {t:'接空間 — 射影', b:'<p>解の前半: 点のところで接平面、すなわち最良の平坦な近似を張ります。回っている珊瑚色のベクトルが生の勾配 —「どの方向にでも自由に動けるとしたら、誤差はどちらに増えるか」です。これは一般に外向きの成分も持ち、球から外れます。そこで分解します: 曲面に垂直な成分（赤）は禁じられた方向へ導くので<em>捨て</em>、平面内に横たわる成分（青緑）が球の上で<em>実際に</em>踏み出せる向きです。</p><p>なぜ「リーマン」か。曲がった曲面の上では、距離や角度を測るのに周囲の空間へ出て行く必要はない、曲面に留まる方向だけを見ればよい — そう見抜いたのが彼だからです。青緑の影こそが<em>曲面の内側での</em>本当の「下り」であり、これをリーマン勾配と呼びます。上を向いた赤い成分は平坦な外の世界が見せる幻で、球の住人にとっては存在しません。</p>'},
   {t:'exp — 複利', b:'<p>後半: 平坦なステップを曲面の上へ巻き戻さねばなりません。<span class="m">n</span> 回の小さなステップ — それぞれその瞬間の接方向に沿って — を複利として: <span class="m">(1 + <span class="frac"><span>v</span><span>n</span></span>)<sup>n</sup> → exp(v)</span>。<span class="m">n</span> が小さいと琥珀色の鎖は外へふくらみ（赤い破線が半径方向の誤差です）、<span class="m">n</span> が大きいと菫色の弧に寄り添います: 誤差は二次で、極限では消えます。</p><p>そして球の上で書き下した対応: <span class="m">exp<sub>p</sub>(v) = cos θ · p + sin θ · v̂</span>、ここで <span class="m">θ = |v|</span> — オイラーの公式やロドリゲスの公式と同じ cos/sin の形です。</p><div class="acts" style="align-items:center"><span class="m" style="min-width:56px">n = <b id="expn" style="font-style:normal;color:var(--amber)">1</b></span><input type="range" id="expsl" min="1" max="40" value="1" style="flex:1;min-width:120px"></div>'},
   {t:'反復', b:'<p>機械を一拍ずつ動かします。色はコスト（暖色ほど誤差が大きい）、緑の点が最小値です。ボタンを押すと 1 回の反復が三拍に分かれて進みます: 接平面と射影された勾配 → exp の弧 → 変位と新しいアンカー。</p><div class="acts"><button class="act" id="s5step">1/3 · 接平面</button><button class="act" id="s5reset">リセット</button></div><div class="s5math" id="s5math"></div><div class="ro" id="s5ph">推定値にアンカー — δ = 0</div><div class="ro">反復: <b id="s5it">0</b> &nbsp;·&nbsp; L = <b id="s5L">—</b></div><div class="s5foot"><button class="s5info" id="s5deltainfo" type="button" aria-expanded="false" aria-controls="s5deltabubble">δ とは？ <span class="ic">ⓘ</span></button><div class="bubble" id="s5deltabubble" role="dialog" aria-label="δ とは" hidden><p>接平面上のステップ、すなわち<em>ただの三つの数</em>です: <span class="m">δ = (δ<sub>x</sub>, δ<sub>y</sub>, δ<sub>z</sub>)</span> — 各軸まわりにどれだけ回すか。「ハット」<span class="m">δ<sup>∧</sup></span> は、この三つの数を exp が受け取れるように歪対称行列へ並べ替えます:</p><p class="matline"><span>δ<sup>∧</sup> =</span><span class="matrix"><span class="mbracket"></span><span class="mgrid"><span>0</span><span>−δ<sub>z</sub></span><span>δ<sub>y</sub></span><span>δ<sub>z</sub></span><span>0</span><span>−δ<sub>x</sub></span><span>−δ<sub>y</sub></span><span>δ<sub>x</sub></span><span>0</span></span><span class="mbracket right"></span></span></p><p>つまり <span class="m">⊞</span> はまったく具体的です: <span class="m">x ⊞ δ := x · exp(δ<sup>∧</sup>)</span> — ふつうの <span class="m">+</span> の一般化です。平坦な空間では 点 + ベクトル = 点。ここでは 多様体の点 + 接ベクトル = 多様体の点。各ラウンドの終わりに <span class="m">δ</span> は 0 に戻ります: 新しい推定値のところで地図を広げ直すのです。</p></div></div>'},
   {t:'SO(3) の本当のかたち', b:'<p>球体の内部の点 = 軸·角度: 方向が回転軸、中心からの距離が角度、境界が 180° です。境界上の対蹠点は<em>同じ</em>回転 — 同一視されており、だから旅人は「向こう側へ跳ぶ」のです。</p><p>旅人は 720° を巡ります。1 周目（琥珀）は境界を 1 回横断する — 奇数回の横断です: このループは縮められません。2 周目（青緑）で横断回数は偶数になり、偶数のループは縮められます。これが <span class="m">π₁ = ℤ/2</span> の中身で、効くのは横断回数の偶奇だけ。皿／ベルトのトリックの数学そのものです: 360° ではねじれが残り、720° でほどけます。</p>'},
   {t:'SE(3) — 時間の中の位置姿勢', b:'<p>回転 + 並進 = 位置姿勢: 6 自由度、経路に沿って動く座標系です。<span class="m">⊞</span> のレシピは同じで、接空間が <span class="m">ℝ⁶</span> になるだけ: 三つの角度と三つの並進。</p><p>ここから SLAM が始まります。こうした位置姿勢が多数、因子で結ばれ、その上で前のステーションの反復が走ります。（<span class="m">v</span> と実際の <span class="m">t</span> の間の機微 — 左ヤコビアン — は次の章です。）</p>'}
  ]
};
