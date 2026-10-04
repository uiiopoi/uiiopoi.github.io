/* Interactive charts built from SPUR Combined Model v8 (static values from the workbook). */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var CFG = [
    { k: 'S', en: 'Solar + BESS', zh: '光伏 + 储能', c: '--s-solar' },
    { k: 'W', en: 'Wind + BESS', zh: '风电 + 储能', c: '--s-wind' },
    { k: 'G', en: 'Geothermal + BESS', zh: '地热 + 储能', c: '--s-geo' }
  ];

  // Fig2_Breakeven: developer levered IRR by grid delay (1–8 yrs)
  var F2 = {
    base: { 30: { S: .1263, W: .1892, G: .2506 }, 0: { S: .0058, W: .0319, G: .0642 } },
    coloc: {
      flat: {
        30: { S: [.0523, .0493, .0466, .0441, .0408, .0377, .0348, .0321], W: [.1170, .1107, .1053, .1006, .0949, .0898, .0852, .0811], G: [.2091, .2006, .1938, .1882, .1818, .1764, .1718, .1679] },
        0: { S: [-.0101, -.0114, -.0128, -.0141, -.0154, -.0167, -.0180, -.0193], W: [.0134, .0116, .0099, .0082, .0066, .0050, .0034, .0019], G: [.0573, .0557, .0541, .0526, .0513, .0500, .0488, .0476] }
      },
      m4: {
        30: { S: [.0698, .0856, .1020, .1179, .1380, .1549, .1684, .1790], W: [.1556, .1890, .2197, .2444, .2700, .2880, .3006, .3094], G: [.2553, .2870, .3122, .3308, .3491, .3616, .3702, .3761] },
        0: { S: [-.0013, .0071, .0164, .0263, .0364, .0464, .0558, .0643], W: [.0244, .0345, .0454, .0567, .0679, .0784, .0880, .0963], G: [.0668, .0748, .0829, .0908, .0983, .1053, .1116, .1171] }
      }
    },
    price: { flat: { 30: { S: 60, W: 60, G: 60 }, 0: { S: 60, W: 60, G: 60 } }, m4: { 30: { S: 121.26, W: 116.35, G: 108.93 }, 0: { S: 136.93, W: 129.77, G: 122.14 } } }
  };
  // Fig3 / M4: price floor, data-center limit, ceiling ($/MWh)
  var F3 = { ceil: 162.82, S: { floor: 79.70, pmax: 154.19, mid: 121.26 }, W: { floor: 69.89, pmax: 132.54, mid: 116.35 }, G: { floor: 55.05, pmax: 122.21, mid: 108.93 } };
  // Fig4_Alpha: bargaining share α → developer IRR, DC savings
  var F4 = {
    a: [0, .1, .2, .35, .5, .65, .8],
    S: { irr: [.0627, .0719, .0820, .0989, .1179, .1390, .1615], sav: [.3322, .3174, .3027, .2806, .2584, .2363, .2142] },
    W: { irr: [.1187, .1387, .1616, .2011, .2444, .2888, .3322], sav: [.4116, .3802, .3488, .3018, .2547, .2076, .1605] },
    G: { irr: [.1773, .2022, .2307, .2790, .3308, .3828, .4329], sav: [.5987, .5347, .4708, .3748, .2788, .1828, .0869] }
  };
  // M3 Structure B all-in build-up ($/MWh)
  var SB = [
    { en: 'Energy (PPA)', zh: '电能（PPA）', v: 70.00, energy: true },
    { en: 'Resource adequacy', zh: '容量充裕度', v: 45.24 },
    { en: 'Non-bypassable charges', zh: '不可绕过费用', v: 23.00 },
    { en: 'Transmission (TAC)', zh: '输电费（TAC）', v: 15.58 },
    { en: 'Shaping / imbalance', zh: '曲线匹配 / 不平衡', v: 7.00 },
    { en: 'Ancillary + scheduling', zh: '辅助服务 + 调度', v: 2.00 }
  ];

  function lang() { return document.documentElement.getAttribute('data-lang') === 'zh' ? 'zh' : 'en'; }
  function L(o) { return o[lang()]; }
  function tr(en, zh) { return lang() === 'zh' ? zh : en; }
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  function el(p, n, a, txt) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; p.appendChild(e); return e; }
  function pct(v, d) { return (v * 100).toFixed(d == null ? 1 : d) + '%'; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tween(ms, fn, done) {
    if (reduce) { fn(1); if (done) done(); return; }
    var t0 = performance.now(), fin = false;
    function end() { if (fin) return; fin = true; fn(1); if (done) done(); }
    (function step(now) { if (fin) return; var t = Math.min(1, (now - t0) / ms); fn(1 - Math.pow(1 - t, 3)); if (t < 1) requestAnimationFrame(step); else end(); })(t0);
    setTimeout(end, ms + 150); // in case animation frames are throttled
  }
  function whenVisible(node, fn) {
    var fired = false, io = null;
    function go() { if (fired) return; fired = true; if (io) io.disconnect(); removeEventListener('scroll', check); fn(); }
    function check() { var r = node.getBoundingClientRect(); if (r.top < innerHeight * .85 && r.bottom > innerHeight * .15) go(); }
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) go(); }, { threshold: .2 });
      io.observe(node);
    }
    addEventListener('scroll', check, { passive: true }); check();
  }

  // shared tooltip
  var tip = document.createElement('div'); tip.className = 'vtip'; tip.setAttribute('role', 'status'); document.body.appendChild(tip);
  function showTip(html, x, y) {
    tip.innerHTML = html; tip.style.opacity = 1;
    var w = tip.offsetWidth, h = tip.offsetHeight, px = x + 14, py = y - h - 10;
    if (px + w > innerWidth - 8) px = x - w - 14; if (py < 8) py = y + 16;
    tip.style.transform = 'translate(' + px + 'px,' + py + 'px)';
  }
  function hideTip() { tip.style.opacity = 0; }
  function key(c, dashed) { return '<i class="vk' + (dashed ? ' dash' : '') + '" style="--k:var(' + c + ')"></i>'; }

  function legend(host, items) {
    host.innerHTML = items.map(function (it) { return '<span>' + key(it.c, it.dashed) + it.label + '</span>'; }).join('');
  }
  function table(host, head, rows) {
    host.innerHTML = '<table><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  }

  /* ---------- Chart A: breakeven ---------- */
  function chartA() {
    var root = document.getElementById('vizA'); if (!root) return;
    var svg = root.querySelector('svg'), W = 560, H = 320, m = { l: 46, r: 92, t: 16, b: 40 };
    var state = { lever: 'm4', itc: 30 }, cur = null, drawn = false;
    function target() {
      var o = { y0: 0, y1: 0, s: {} };
      CFG.forEach(function (c) { o.s[c.k] = { base: F2.base[state.itc][c.k], col: F2.coloc[state.lever][state.itc][c.k].slice() }; });
      var all = []; CFG.forEach(function (c) { all = all.concat(o.s[c.k].col, [o.s[c.k].base]); });
      var lo = Math.min.apply(0, all), hi = Math.max.apply(0, all), step = hi - lo > .2 ? .1 : .05;
      o.y0 = Math.min(0, Math.floor(lo / step) * step); o.y1 = Math.ceil(hi / step) * step + (step / 4); o.step = step;
      return o;
    }
    function mix(a, b, t) {
      var o = { y0: lerp(a.y0, b.y0, t), y1: lerp(a.y1, b.y1, t), step: b.step, s: {} };
      CFG.forEach(function (c) { o.s[c.k] = { base: lerp(a.s[c.k].base, b.s[c.k].base, t), col: b.s[c.k].col.map(function (v, i) { return lerp(a.s[c.k].col[i], v, t); }) }; });
      return o;
    }
    function render(d, grow) {
      svg.innerHTML = '';
      var x = function (yr) { return m.l + (yr - 1) / 7 * (W - m.l - m.r); }, y = function (v) { return m.t + (1 - (v - d.y0) / (d.y1 - d.y0)) * (H - m.t - m.b); };
      for (var v = Math.ceil(d.y0 / d.step) * d.step; v <= d.y1 + 1e-9; v += d.step) {
        el(svg, 'line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: Math.abs(v) < 1e-9 ? 'vz-zero' : 'vz-grid' });
        el(svg, 'text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'vz-tick' }, Math.round(v * 100) + '%');
      }
      for (var yr = 1; yr <= 8; yr++) el(svg, 'text', { x: x(yr), y: H - m.b + 18, 'text-anchor': 'middle', class: 'vz-tick' }, yr);
      el(svg, 'text', { x: (m.l + W - m.r) / 2, y: H - 4, 'text-anchor': 'middle', class: 'vz-axis' }, tr('Grid connection delay (years)', '并网延迟（年）'));
      var g = grow == null ? 1 : grow, cut = 1 + 7 * g, labels = [];
      CFG.forEach(function (c) {
        var s = d.s[c.k], col = 'var(' + c.c + ')';
        el(svg, 'line', { x1: x(1), x2: x(cut), y1: y(s.base), y2: y(s.base), class: 'vz-base', style: 'stroke:' + col });
        var pts = s.col.map(function (v, i) { return [x(i + 1), y(v)]; }).filter(function (p, i) { return i + 1 <= cut + 1e-9; });
        el(svg, 'polyline', { points: pts.map(function (p) { return p.join(','); }).join(' '), class: 'vz-line', style: 'stroke:' + col });
        // breakeven crossing
        for (var i = 0; i < 7; i++) {
          var a = s.col[i] - s.base, b = s.col[i + 1] - s.base;
          if (a < 0 && b >= 0 && g === 1) {
            var f = a / (a - b), bx = x(i + 1 + f);
            el(svg, 'circle', { cx: bx, cy: y(s.base), r: 5, class: 'vz-dot', style: 'fill:' + col });
            el(svg, 'text', { x: bx, y: y(s.base) - 10, 'text-anchor': 'middle', class: 'vz-note' }, '≈' + (i + 1 + f).toFixed(1) + tr(' yr', ' 年'));
          }
        }
        if (g === 1) { el(svg, 'circle', { cx: x(8), cy: y(s.col[7]), r: 4, class: 'vz-dot', style: 'fill:' + col }); labels.push({ y: y(s.col[7]), t: L(c).split(' ')[0] + ' ' + pct(s.col[7], 0) }); }
      });
      // de-collide end labels
      labels.sort(function (p, q) { return p.y - q.y; });
      for (var j = 1; j < labels.length; j++) if (labels[j].y - labels[j - 1].y < 15) labels[j].y = labels[j - 1].y + 15;
      labels.forEach(function (lb) { el(svg, 'text', { x: W - m.r + 10, y: lb.y + 4, class: 'vz-end' }, lb.t); });
      // hover layer
      var hair = el(svg, 'line', { y1: m.t, y2: H - m.b, class: 'vz-hair', style: 'opacity:0' });
      var hit = el(svg, 'rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' });
      function move(ev) {
        var r = svg.getBoundingClientRect(), cx = (ev.touches ? ev.touches[0].clientX : ev.clientX), vx = (cx - r.left) / r.width * W;
        var yr = Math.max(1, Math.min(8, Math.round(1 + (vx - m.l) / (W - m.l - m.r) * 7)));
        hair.setAttribute('x1', x(yr)); hair.setAttribute('x2', x(yr)); hair.style.opacity = .6;
        var html = '<b>' + tr('Delay ', '延迟 ') + yr + tr(' yr', ' 年') + '</b>';
        CFG.forEach(function (c) { var s = d.s[c.k]; html += '<div>' + key(c.c) + L(c) + ': <b>' + pct(s.col[yr - 1]) + '</b> <span class="mut">' + tr('vs wait ', '等待 ') + pct(s.base) + '</span></div>'; });
        showTip(html, cx, (ev.touches ? ev.touches[0].clientY : ev.clientY));
      }
      hit.addEventListener('mousemove', move); hit.addEventListener('touchmove', move, { passive: true });
      hit.addEventListener('mouseleave', function () { hair.style.opacity = 0; hideTip(); });
    }
    function update(animate) {
      var t = target();
      legend(root.querySelector('.vz-legend'), CFG.map(function (c) { return { c: c.c, label: L(c) + ' · $' + F2.price[state.lever][state.itc][c.k].toFixed(0) }; })
        .concat([{ c: '--muted', dashed: true, label: tr('Dashed = wait for grid', '虚线 = 等待并网') }]));
      table(root.querySelector('.vz-table'), [tr('Delay (yr)', '延迟（年）')].concat(CFG.map(function (c) { return L(c) + tr(' co-loc', ' 共址'); })),
        [[tr('Wait (baseline)', '等待（基准）')].concat(CFG.map(function (c) { return pct(t.s[c.k].base); }))].concat(
          [1, 2, 3, 4, 5, 6, 7, 8].map(function (yr) { return [yr].concat(CFG.map(function (c) { return pct(t.s[c.k].col[yr - 1]); })); })));
      if (!drawn) return;
      if (!animate || !cur) { cur = t; render(t); return; }
      var from = cur; tween(650, function (k) { render(mix(from, t, k)); }, function () { cur = t; render(t); });
    }
    root.querySelectorAll('[data-lever]').forEach(function (b) { b.onclick = function () { state.lever = b.dataset.lever; seg(root, 'lever', b); update(true); }; });
    root.querySelectorAll('[data-itc]').forEach(function (b) { b.onclick = function () { state.itc = +b.dataset.itc; seg(root, 'itc', b); update(true); }; });
    update(false);
    whenVisible(root, function () { drawn = true; cur = target(); tween(1100, function (k) { render(cur, k); }, function () { render(cur); }); });
    return function () { update(false); if (drawn) render(cur); };
  }
  function seg(root, name, b) { root.querySelectorAll('[data-' + name + ']').forEach(function (o) { o.setAttribute('aria-pressed', o === b); }); }

  /* ---------- Chart B: negotiation zone ---------- */
  function chartB() {
    var root = document.getElementById('vizB'); if (!root) return;
    var svg = root.querySelector('svg'), W = 560, H = 250, m = { l: 92, r: 18, t: 30, b: 40 }, X1 = 175, drawn = false;
    var x = function (v) { return m.l + v / X1 * (W - m.l - m.r); }, band = (H - m.t - m.b) / 3, bh = 22;
    function render(g) {
      svg.innerHTML = '';
      [0, 40, 80, 120, 160].forEach(function (v) { el(svg, 'line', { x1: x(v), x2: x(v), y1: m.t - 8, y2: H - m.b, class: 'vz-grid' }); el(svg, 'text', { x: x(v), y: H - m.b + 18, 'text-anchor': 'middle', class: 'vz-tick' }, '$' + v); });
      el(svg, 'text', { x: (m.l + W - m.r) / 2, y: H - 4, 'text-anchor': 'middle', class: 'vz-axis' }, tr('BTM price ($/MWh)', '表后电价（$/MWh）'));
      CFG.forEach(function (c, i) {
        var d = F3[c.k], cy = m.t + band * i + band / 2, y0 = cy - bh / 2, col = 'var(' + c.c + ')';
        el(svg, 'text', { x: m.l - 10, y: cy + 4, 'text-anchor': 'end', class: 'vz-cat' }, L(c).split(' ')[0]);
        var segs = [
          { a: 0, b: d.floor, cls: 'vz-floor', en: 'Below developer cost (LCOE)', zh: '低于开发商成本（LCOE）' },
          { a: d.floor, b: d.pmax, cls: '', style: 'fill:' + col, en: 'Both sides better off', zh: '双方都受益' },
          { a: d.pmax, b: F3.ceil, cls: 'vz-wash', style: 'fill:' + col, en: 'DC saves < 20%', zh: '数据中心节省 < 20%' }
        ];
        segs.forEach(function (s, j) {
          var xa = x(s.a) + (j ? 1 : 0), xb = x(s.a + (s.b - s.a) * g) - (j < 2 ? 1 : 0);
          var r = el(svg, 'path', { d: barPath(xa, y0, Math.max(0, xb - xa), bh, j === 2 ? 4 : 0), class: 'vz-bar ' + s.cls, style: s.style || '' });
          r.addEventListener('mousemove', function (ev) {
            showTip('<b>' + L(c) + '</b><div>' + (s.cls === '' ? key(c.c) : '') + L(s) + '</div><div class="mut">$' + s.a.toFixed(2) + ' – $' + s.b.toFixed(2) + '/MWh</div>', ev.clientX, ev.clientY);
          });
          r.addEventListener('mouseleave', hideTip);
        });
        if (g === 1) {
          el(svg, 'circle', { cx: x(d.mid), cy: cy, r: 5, class: 'vz-dot vz-mid' });
          el(svg, 'text', { x: x(d.mid), y: y0 - 6, 'text-anchor': 'middle', class: 'vz-note' }, '$' + d.mid.toFixed(0));
        }
      });
      // $60 marker + ceiling
      el(svg, 'line', { x1: x(60), x2: x(60), y1: m.t - 14, y2: H - m.b, class: 'vz-mark' });
      el(svg, 'text', { x: x(60), y: m.t - 18, 'text-anchor': 'middle', class: 'vz-note' }, tr('Industry $60', '行业惯例 $60'));
      el(svg, 'line', { x1: x(F3.ceil), x2: x(F3.ceil), y1: m.t - 14, y2: H - m.b, class: 'vz-mark' });
      el(svg, 'text', { x: x(F3.ceil), y: m.t - 18, 'text-anchor': 'end', class: 'vz-note' }, tr('Grid alternative $163', '电网替代成本 $163'));
    }
    function update() {
      legend(root.querySelector('.vz-legend'), [{ c: '--floor', label: tr('Below LCOE', '低于 LCOE') }, { c: '--s-wind', label: tr('Mutually acceptable (colour = technology)', '双方可接受（颜色区分技术）') }, { c: '--wash', label: tr('DC saves < 20%', '数据中心节省 < 20%') }]);
      table(root.querySelector('.vz-table'), [tr('Configuration', '配置'), tr('LCOE floor', 'LCOE 下限'), tr('DC 20% limit', '数据中心 20% 上限'), tr('Range width', '区间宽度'), tr('Midpoint', '中点')],
        CFG.map(function (c) { var d = F3[c.k]; return [L(c), '$' + d.floor.toFixed(2), '$' + d.pmax.toFixed(2), '$' + (d.pmax - d.floor).toFixed(2), '$' + d.mid.toFixed(2)]; }));
      if (drawn) render(1);
    }
    update();
    whenVisible(root, function () { drawn = true; tween(1200, render, function () { render(1); }); });
    return update;
  }
  function barPath(x, y, w, h, r) { r = Math.min(r, w); return r ? 'M' + x + ',' + y + 'h' + (w - r) + 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r + 'v' + (h - 2 * r) + 'a' + r + ',' + r + ' 0 0 1 ' + (-r) + ',' + r + 'h' + (r - w) + 'z' : 'M' + x + ',' + y + 'h' + w + 'v' + h + 'h' + (-w) + 'z'; }

  /* ---------- Chart C: bargaining share ---------- */
  function chartC() {
    var root = document.getElementById('vizC'); if (!root) return;
    var svg = root.querySelector('svg'), W = 560, H = 330, m = { l: 50, r: 20, t: 16, b: 42 }, slider = root.querySelector('input[type=range]'), out = root.querySelector('.vz-out');
    var x = function (v) { return m.l + v / .65 * (W - m.l - m.r); }, y = function (v) { return m.t + (1 - v / .45) * (H - m.t - m.b); };
    function at(k, a) {
      var A = F4.a, i = 0; while (i < A.length - 2 && a > A[i + 1]) i++;
      var t = (a - A[i]) / (A[i + 1] - A[i]); t = Math.max(0, Math.min(1, t));
      return { irr: lerp(F4[k].irr[i], F4[k].irr[i + 1], t), sav: lerp(F4[k].sav[i], F4[k].sav[i + 1], t), price: F3[k].floor + a * (F3.ceil - F3[k].floor) };
    }
    function render() {
      var a = +slider.value / 100; svg.innerHTML = '';
      el(svg, 'rect', { x: x(.2), y: m.t, width: x(.65) - x(.2), height: y(.10) - m.t, class: 'vz-win' });
      el(svg, 'text', { x: x(.64), y: m.t + 16, 'text-anchor': 'end', class: 'vz-wintxt' }, tr('Both sides clear their thresholds', '双方都达到门槛'));
      [0, .1, .2, .3, .4].forEach(function (v) { el(svg, 'line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: v ? 'vz-grid' : 'vz-zero' }); el(svg, 'text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'vz-tick' }, v * 100 + '%'); });
      [0, .2, .4, .6].forEach(function (v) { el(svg, 'text', { x: x(v), y: H - m.b + 18, 'text-anchor': 'middle', class: 'vz-tick' }, v * 100 + '%'); });
      el(svg, 'line', { x1: x(.2), x2: x(.2), y1: m.t, y2: H - m.b, class: 'vz-mark' });
      el(svg, 'line', { x1: m.l, x2: W - m.r, y1: y(.1), y2: y(.1), class: 'vz-mark' });
      el(svg, 'text', { x: (m.l + W - m.r) / 2, y: H - 4, 'text-anchor': 'middle', class: 'vz-axis' }, tr('Data center savings vs. grid', '数据中心相对电网的节省'));
      el(svg, 'text', { x: 12, y: (m.t + H - m.b) / 2, transform: 'rotate(-90 12 ' + (m.t + H - m.b) / 2 + ')', 'text-anchor': 'middle', class: 'vz-axis' }, tr('Developer levered IRR', '开发商杠杆 IRR'));
      var rows = [];
      CFG.forEach(function (c) {
        var col = 'var(' + c.c + ')';
        el(svg, 'polyline', { points: F4.a.map(function (_, i) { return x(F4[c.k].sav[i]) + ',' + y(F4[c.k].irr[i]); }).join(' '), class: 'vz-trail', style: 'stroke:' + col });
        var p = at(c.k, a), win = p.irr >= .1 && p.sav >= .2;
        var dot = el(svg, 'circle', { cx: x(p.sav), cy: y(p.irr), r: 7, class: 'vz-dot', style: 'fill:' + col });
        el(svg, 'text', { x: x(p.sav) + 11, y: y(p.irr) + 4, class: 'vz-end' }, L(c).split(' ')[0]);
        dot.addEventListener('mousemove', function (ev) { showTip('<b>' + L(c) + '</b><div>' + tr('BTM price ', '表后电价 ') + '$' + p.price.toFixed(0) + '/MWh</div><div>' + tr('Developer IRR ', '开发商 IRR ') + pct(p.irr) + '</div><div>' + tr('DC savings ', '数据中心节省 ') + pct(p.sav) + '</div>', ev.clientX, ev.clientY); });
        dot.addEventListener('mouseleave', hideTip);
        rows.push('<span>' + key(c.c) + L(c).split(' ')[0] + ' <b>$' + p.price.toFixed(0) + '</b> ' + (win ? '✓' : '✗') + '</span>');
      });
      out.innerHTML = '<b>α = ' + a.toFixed(2) + '</b> ' + rows.join('');
    }
    function update() {
      table(root.querySelector('.vz-table'), ['α'].concat(CFG.map(function (c) { return L(c).split(' ')[0] + ' IRR'; }), CFG.map(function (c) { return L(c).split(' ')[0] + tr(' DC saving', ' 节省'); })),
        F4.a.map(function (a, i) { return [a].concat(CFG.map(function (c) { return pct(F4[c.k].irr[i]); }), CFG.map(function (c) { return pct(F4[c.k].sav[i]); })); }));
      render();
    }
    slider.addEventListener('input', render);
    update();
    whenVisible(root, function () { if (reduce) return; var from = 0, to = 50; tween(1400, function (k) { slider.value = lerp(from, to, k); render(); }); });
    return update;
  }

  /* ---------- Chart D: why the ceiling is high ---------- */
  function chartD() {
    var root = document.getElementById('vizD'); if (!root) return;
    var svg = root.querySelector('svg'), W = 560, H = 300, m = { l: 46, r: 150, t: 16, b: 44 }, Y1 = 250, drawn = false;
    var y = function (v) { return m.t + (1 - v / Y1) * (H - m.t - m.b); }, cols = [
      { en: 'Energy-only PPA', zh: '仅电能 PPA', parts: [{ v: 72, energy: true, en: 'Energy-only PPA', zh: '仅电能 PPA' }] },
      { en: 'Utility tariff', zh: '电力公司电价', parts: [{ v: 236.91, util: true, en: 'PG&E B-20 bundled rate', zh: 'PG&E B-20 打包电价' }] },
      { en: 'Sleeved grid PPA', zh: '电网转供 PPA', parts: SB }
    ];
    var cw = 54, gap = (W - m.l - m.r) / cols.length;
    function render(g) {
      svg.innerHTML = '';
      [0, 50, 100, 150, 200, 250].forEach(function (v) { el(svg, 'line', { x1: m.l, x2: W - m.r + 10, y1: y(v), y2: y(v), class: v ? 'vz-grid' : 'vz-zero' }); el(svg, 'text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'vz-tick' }, '$' + v); });
      cols.forEach(function (c, ci) {
        var cx = m.l + gap * ci + gap / 2 - cw / 2, acc = 0, tot = c.parts.reduce(function (s, p) { return s + p.v; }, 0), shown = tot * g;
        c.parts.forEach(function (p, pi) {
          var v0 = acc, v1 = Math.min(acc + p.v, shown); acc += p.v; if (v1 <= v0) return;
          var top = pi === c.parts.length - 1 && v1 >= tot - 1e-6;
          var yA = y(v1), h = y(v0) - y(v1) - (pi ? 2 : 0);
          var r = el(svg, 'path', { d: colPath(cx, yA, cw, Math.max(0, h), top ? 4 : 0), class: 'vz-bar ' + (p.energy ? 'vz-energy' : p.util ? 'vz-util' : 'vz-wires') });
          r.addEventListener('mousemove', function (ev) { showTip('<b>' + L(p) + '</b><div>$' + p.v.toFixed(2) + '/MWh</div>', ev.clientX, ev.clientY); });
          r.addEventListener('mouseleave', hideTip);
          if (ci === 2 && g === 1 && h >= 13) el(svg, 'text', { x: cx + cw + 8, y: yA + h / 2 + 4, class: 'vz-seglbl' }, L(p) + ' $' + p.v.toFixed(0));
        });
        el(svg, 'text', { x: cx + cw / 2, y: y(shown) - 8, 'text-anchor': 'middle', class: 'vz-val' }, '$' + shown.toFixed(0));
        el(svg, 'text', { x: cx + cw / 2, y: H - m.b + 18, 'text-anchor': 'middle', class: 'vz-cat' }, L(c));
      });
      if (g === 1) {
        var bx = m.l + gap * 2 + gap / 2 - cw / 2 - 10;
        el(svg, 'path', { d: 'M' + bx + ',' + y(70) + 'h-5v' + (y(162.82) - y(70)) + 'h5', class: 'vz-brace' });
        el(svg, 'text', { x: bx - 9, y: (y(70) + y(162.82)) / 2 + 4, 'text-anchor': 'end', class: 'vz-note' }, '+$93');
      }
      el(svg, 'text', { x: m.l, y: H - 6, class: 'vz-axis' }, tr('All-in delivered cost to a 100 MW data center ($/MWh)', '100 MW 数据中心的全包到户成本（$/MWh）'));
    }
    function update() {
      legend(root.querySelector('.vz-legend'), [{ c: '--energy', label: tr('Energy', '电能') }, { c: '--wires', label: tr('Wires, capacity & fees (avoidable behind the meter)', '输配电、容量与各项费用（表后可避免）') }]);
      table(root.querySelector('.vz-table'), [tr('Component', '组成'), '$/MWh'], SB.map(function (p) { return [L(p), p.v.toFixed(2)]; }).concat([[tr('<b>Sleeved PPA total</b>', '<b>电网转供 PPA 合计</b>'), '<b>162.82</b>'], [tr('Utility tariff (PG&E B-20)', '电力公司电价（PG&E B-20）'), '236.91']]));
      if (drawn) render(1);
    }
    update();
    whenVisible(root, function () { drawn = true; tween(1400, render, function () { render(1); }); });
    return update;
  }
  function colPath(x, y, w, h, r) { r = Math.min(r, h); return r ? 'M' + x + ',' + (y + h) + 'v' + (r - h) + 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + (-r) + 'h' + (w - 2 * r) + 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r + 'v' + (h - r) + 'z' : 'M' + x + ',' + y + 'h' + w + 'v' + h + 'h' + (-w) + 'z'; }

  var updaters = [chartA(), chartB(), chartC(), chartD()].filter(Boolean);
  window.addEventListener('langchange', function () { updaters.forEach(function (f) { f(); }); });
})();
