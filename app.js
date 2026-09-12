// $SHERIFF site. Copy CA, live Sinjoh leaderboard, GeckoTerminal price.
(function () {
  var ME = '0xb40921cb9e3ede2b3f0edfb26f652f2739fdb51c';
  var PROXY = 'https://vpmmomlhrgntyocoooze.supabase.co/functions/v1/sinjoh-proxy?ep=';
  var POOL = 'https://api.geckoterminal.com/api/v2/networks/robinhood/pools/0xe2efd26941019c47daa5e7bd7f7a1b709816fcc5429ceac1ed3cb58e94b30566';
  var TOP = 12;

  // --- copy CA ---
  var toast = document.getElementById('toast');
  var toastT;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toast.classList.remove('show'); }, 1600);
  }
  document.querySelectorAll('[data-copy]').forEach(function (el) {
    el.addEventListener('click', function () {
      var v = el.getAttribute('data-copy');
      var done = function () { el.classList.add('is-copied'); showToast('copied ' + v.slice(0, 6) + '...' + v.slice(-4)); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(v).then(done, function () { fallback(v); done(); });
      } else { fallback(v); done(); }
    });
  });
  function fallback(v) {
    var ta = document.createElement('textarea');
    ta.value = v; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  // --- formatting ---
  function usd(n) {
    n = Number(n);
    if (!isFinite(n)) return null;
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e4) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function price(n) {
    n = Number(n);
    if (!isFinite(n)) return null;
    if (n >= 1) return '$' + n.toFixed(2);
    if (n >= 0.01) return '$' + n.toFixed(4);
    var s = n.toFixed(12).replace(/0+$/, '');
    var m = s.match(/^0\.(0+)(\d+)$/);
    if (m && m[1].length >= 3) {
      var subs = '₀₁₂₃₄₅₆₇₈₉';
      var z = String(m[1].length).split('').map(function (c) { return subs[+c]; }).join('');
      return '$0.0' + z + m[2].slice(0, 4);
    }
    return '$' + n.toPrecision(4);
  }
  function short(a) { return a ? (a.slice(0, 5) + '…' + a.slice(-3)).toUpperCase() : ''; }
  function setAll(sel, val, cls) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.textContent = val == null ? 'n/a' : val;
      if (cls !== undefined) el.className = cls;
    });
  }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // --- Sinjoh leaderboard ---
  function getJSON(u) {
    return fetch(u, { headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }
  function phaseOf(a, md) {
    var p = a.phase || (md && md.graduated ? 'graduated' : '');
    if (!p) p = 'live';
    return p;
  }
  function loadBoard() {
    Promise.all([getJSON(PROXY + 'explore-analytics'), getJSON(PROXY + 'launch-metadata')]).then(function (res) {
      var analytics = res[0].analytics || [];
      var meta = {};
      (res[1].launches || []).forEach(function (m) { meta[m.subject.toLowerCase()] = m; });

      var rows = analytics.map(function (a) {
        var s = a.subject.toLowerCase();
        var md = meta[s] || {};
        return {
          subject: s, name: md.name || short(s), symbol: md.symbol || '???',
          logo: md.logo || '', mcap: Number(a.marketCapUsd) || 0, vol: Number(a.volumeTotalUsd) || 0,
          holders: a.holderCount, phase: phaseOf(a, md)
        };
      }).sort(function (x, y) { return y.mcap - x.mcap; });

      var total = rows.length;
      var idx = rows.findIndex(function (r) { return r.subject === ME; });
      var me = rows[idx];
      var one = rows[0];

      setAll('[data-total]', total.toLocaleString('en-US'));
      setAll('[data-updated]', 'updated ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));

      if (me) {
        var rank = idx + 1;
        setAll('[data-rank]', '#' + rank);
        setAll('[data-rank-num]', String(rank));
        setAll('[data-stat="mcap"]', usd(me.mcap));
        setAll('[data-stat="mcap2"]', usd(me.mcap));
        setAll('[data-stat="voltotal"]', usd(me.vol));
        document.querySelectorAll('[data-phase]').forEach(function (el) {
          el.textContent = me.phase; el.className = 'pill is-' + me.phase;
        });

        var gap = Math.max(0, one.mcap - me.mcap);
        var pct = one.mcap > 0 ? Math.min(100, (me.mcap / one.mcap) * 100) : 0;
        // bar is log scale so the gap is visible at any size
        var lp = (me.mcap > 0 && one.mcap > 1) ? Math.min(100, Math.max(0, (Math.log10(me.mcap) / Math.log10(one.mcap)) * 100)) : 0;
        var note = document.querySelector('[data-rank-note]');
        if (rank === 1) {
          setAll('[data-gap]', '$0');
          note.textContent = 'The Sheriff sits at the top. Keep him there.';
          document.querySelector('[data-gap-note]').textContent = 'Nothing left to overtake.';
        } else {
          setAll('[data-gap]', usd(gap));
          note.textContent = 'Behind $' + one.symbol + ' at ' + usd(one.mcap) + '. ' + (one.mcap / Math.max(1, me.mcap)).toFixed(1) + 'x to go.';
          document.querySelector('[data-gap-note]').textContent = 'Market cap needed to pass $' + one.symbol + '. ' + pct.toFixed(1) + '% of the way there. Bar is log scale.';
        }
        document.querySelector('[data-bar]').style.width = Math.max(1.5, lp) + '%';
        document.querySelector('[data-bar-you]').style.left = Math.max(1.5, lp) + '%';

        var nx = document.querySelector('[data-next]');
        var ahead = rows.slice(Math.max(0, idx - 3), idx).reverse();
        if (!ahead.length) {
          nx.innerHTML = '<span class="next__empty">No one ahead. Sheriff is #1.</span>';
        } else {
          nx.innerHTML = ahead.map(function (r, i) {
            return '<a class="next__row" href="https://app.sinjoh.com/token/' + r.subject + '" target="_blank" rel="noopener">' +
              '<img src="' + esc(r.logo) + '" alt="" loading="lazy">' +
              '<div class="n"><b>#' + (idx - i) + ' ' + esc(r.name) + '</b><span>$' + esc(r.symbol) + '</span></div>' +
              '<span class="d">+' + usd(r.mcap - me.mcap) + '</span></a>';
          }).join('');
        }
      } else {
        setAll('[data-rank]', 'n/a'); setAll('[data-rank-num]', '?');
        document.querySelector('[data-rank-note]').textContent = 'Sheriff not found in the Sinjoh index right now.';
      }

      var board = document.getElementById('board');
      var top = rows.slice(0, TOP);
      if (me && idx >= TOP) top.push(me);
      board.innerHTML = top.map(function (r) {
        var rank = rows.indexOf(r) + 1;
        var cls = 'tcard is-' + r.phase + (r.subject === ME ? ' is-you' : '');
        return '<a class="' + cls + '" href="https://app.sinjoh.com/token/' + r.subject + '" target="_blank" rel="noopener">' +
          '<span class="pill tcard__phase is-' + r.phase + '">' + esc(r.phase) + '</span>' +
          '<span class="tcard__rank">#' + rank + '</span>' +
          '<img class="tcard__logo" src="' + esc(r.logo) + '" alt="" loading="lazy" width="72" height="72">' +
          '<div class="tcard__foot"><div class="tcard__name"><b>' + esc(r.name) + '</b><span>$' + esc(r.symbol) + ' · ' + short(r.subject) + '</span></div>' +
          '<div class="tcard__mc"><span>Market cap</span><b>' + usd(r.mcap) + '</b></div></div></a>';
      }).join('');
    }).catch(function (e) {
      document.getElementById('board').innerHTML = '<div class="dir__err">Leaderboard unavailable right now. <a href="https://app.sinjoh.com/" target="_blank" rel="noopener">Open Sinjoh</a></div>';
      setAll('[data-updated]', 'offline');
      setAll('[data-rank-num]', '?');
      document.querySelector('[data-rank-note]').textContent = 'Could not reach the Sinjoh index.';
    });
  }

  // --- GeckoTerminal price ---
  function loadPrice() {
    getJSON(POOL).then(function (d) {
      var a = d.data.attributes;
      setAll('[data-stat="price"]', price(a.base_token_price_usd));
      setAll('[data-stat="liq"]', usd(a.reserve_in_usd));
      var c = Number(a.price_change_percentage && a.price_change_percentage.h24);
      setAll('[data-stat="chg"]', isFinite(c) ? (c > 0 ? '+' : '') + c.toFixed(1) + '%' : null, c > 0 ? 'up' : c < 0 ? 'down' : '');
    }).catch(function () {
      setAll('[data-stat="price"]', 'n/a'); setAll('[data-stat="liq"]', 'n/a'); setAll('[data-stat="chg"]', 'n/a');
    });
  }

  loadBoard(); loadPrice();
  setInterval(loadBoard, 60000);
  setInterval(loadPrice, 60000);
})();
