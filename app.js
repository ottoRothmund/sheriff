// $SHERIFF site. Copy CA, live stats from GeckoTerminal, scroll reveal.
(function () {
  var POOL = 'https://api.geckoterminal.com/api/v2/networks/robinhood/pools/0xe2efd26941019c47daa5e7bd7f7a1b709816fcc5429ceac1ed3cb58e94b30566';

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

  // --- stats ---
  function fmtUsd(n, opts) {
    n = Number(n);
    if (!isFinite(n)) return null;
    if (opts && opts.price) {
      if (n >= 1) return '$' + n.toFixed(2);
      if (n >= 0.01) return '$' + n.toFixed(4);
      // subscript zeros for tiny prices, e.g. $0.0₄1298
      var s = n.toFixed(12).replace(/0+$/, '');
      var m = s.match(/^0\.(0+)(\d+)$/);
      if (m && m[1].length >= 3) {
        var subs = '₀₁₂₃₄₅₆₇₈₉';
        var z = String(m[1].length).split('').map(function (c) { return subs[+c]; }).join('');
        return '$0.0' + z + m[2].slice(0, 4);
      }
      return '$' + n.toPrecision(4);
    }
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n.toFixed(0);
  }
  function set(key, val, cls) {
    var el = document.querySelector('[data-stat="' + key + '"]');
    if (!el) return;
    el.className = cls || '';
    el.textContent = val == null ? 'n/a' : val;
  }
  function loadStats() {
    fetch(POOL, { headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var a = d.data.attributes;
        set('price', fmtUsd(a.base_token_price_usd, { price: true }));
        set('fdv', fmtUsd(a.fdv_usd));
        set('liq', fmtUsd(a.reserve_in_usd));
        set('vol', fmtUsd(a.volume_usd && a.volume_usd.h24));
        var chg = a.price_change_percentage && a.price_change_percentage.h24;
        var c = Number(chg);
        set('chg', isFinite(c) ? (c > 0 ? '+' : '') + c.toFixed(1) + '%' : null, c > 0 ? 'up' : c < 0 ? 'down' : '');
      })
      .catch(function () {
        ['price', 'fdv', 'liq', 'vol', 'chg'].forEach(function (k) { set(k, 'unavailable', 'err'); });
      });
  }
  loadStats();
  setInterval(loadStats, 60000);

  // --- reveal ---
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var els = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(function (e) { e.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.15 });
    els.forEach(function (e) { io.observe(e); });
  }
})();
