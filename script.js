
(function () {
"use strict";

var $ = function(id) {
  return document.getElementById(id);
};

var DEF = [
  {id:"sol",name:"Sol"},
  {id:"mercurio",name:"Mercúrio"},
  {id:"venus",name:"Vênus"},
  {id:"terra",name:"Terra"},
  {id:"marte",name:"Marte"},
  {id:"jupiter",name:"Júpiter"},
  {id:"saturno",name:"Saturno"},
  {id:"urano",name:"Urano"},
  {id:"netuno",name:"Netuno"},
  {id:"lua",name:"Lua"}
];

var BODY = {
  sol:{r:60,R:0,P:0,c:["#fff6c2","#ffb300"]},
  mercurio:{r:17,R:110,P:12,c:["#d6c6b6","#7d6e63"]},
  venus:{r:24,R:160,P:20,c:["#f8dba4","#c98d3b"]},
  terra:{r:27,R:215,P:30,c:["#8fd0ff","#2b6cb0"]},
  marte:{r:20,R:270,P:42,c:["#ffa684","#b5472a"]},
  jupiter:{r:46,R:355,P:70,c:["#eed3ae","#b57a4c"]},
  saturno:{r:38,R:450,P:100,c:["#f6e3ab","#c1a15b"],ring:true},
  urano:{r:30,R:530,P:140,c:["#c8f6f8","#5bb8c4"]},
  netuno:{r:29,R:605,P:190,c:["#9bb8ff","#3052c8"]},
  lua:{r:14,R:50,P:6,c:["#f0f0f0","#999"],parent:"terra"}
};

var OFF = {};
DEF.forEach(function(d,i) {
  OFF[d.id] = i * 1.3 + .4;
});

/* CONFIGURAÇÃO */

var base = {
  title:"Nosso Universo",
  sub:"Cada planeta guarda uma lembrança nossa",
  sign:"Com todo o meu amor ♥",
  saved:false,
  locked:false
};

var cfg = {};

try {
  cfg = JSON.parse($("config").textContent || "{}");
} catch(e) {
  cfg = {};
}

if (!cfg.saved) {
  try {
    var d = JSON.parse(localStorage.getItem("nosso-universo") || "null");
    if (d) cfg = d;
  } catch(e) {}
}

function merge(c) {
  var o = {};

  for (var k in base) {
    o[k] = c[k] !== undefined ? c[k] : base[k];
  }

  o.items = DEF.map(function(d) {
    var f = (c.items || []).filter(function(x) {
      return x.id === d.id;
    })[0] || {};

    return {
      id:d.id,
      name:f.name || d.name,
      msg:f.msg || "",
      photo:f.photo || ""
    };
  });

  return o;
}

cfg = merge(cfg);

var imgs = {};

function loadImg(it) {
  if (!it.photo) {
    imgs[it.id] = null;
    return;
  }

  var im = new Image();

  im.onload = function() {
    imgs[it.id] = im;
    refreshThumbs();
  };

  im.src = it.photo;
}

cfg.items.forEach(loadImg);

var saveT;

function save() {
  clearTimeout(saveT);

  saveT = setTimeout(function() {
    try {
      localStorage.setItem("nosso-universo", JSON.stringify(cfg));
    } catch(e) {}
  }, 400);
}

function item(id) {
  return cfg.items.filter(function(i) {
    return i.id === id;
  })[0];
}

/* TEXTOS */

function applyTexts() {
  $("iTitle").textContent = cfg.title;
  $("iSub").textContent = cfg.sub;
  $("iSign").textContent = cfg.sign;
  document.title = cfg.title || "Nosso Universo";
}

applyTexts();

/* CANVAS */

var cv = $("c");
var ctx = cv.getContext("2d");

var W = 0;
var H = 0;
var DPR = 1;
var ty = .5;
var fit = 1;
var zoom = 1;
var minZ = .2;
var maxZ = 3;
var userZoomed = false;

var cam = {x:0,y:0};
var T = 0;
var paused = false;
var speed = 1;
var hover = null;
var drawn = [];

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;

  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);

  cv.style.width = W + "px";
  cv.style.height = H + "px";

  ty = Math.min(.95, Math.max(.45, H / W * .6));

  fit = Math.min(W * .47 / 640, H * .42 / (640 * ty));

  minZ = fit * .7;
  maxZ = fit * 7;

  if (!userZoomed) zoom = fit;
}

window.addEventListener("resize", resize);
resize();

/* ESTRELAS E ASTEROIDES */

var stars = [];

for (var i = 0; i < 240; i++) {
  stars.push({
    x:Math.random(),
    y:Math.random(),
    s:Math.random() * 1.4 + .3,
    p:Math.random() * 6.28
  });
}

var belt = [];

for (var j = 0; j < 170; j++) {
  belt.push({
    a:Math.random() * 6.28,
    R:300 + Math.random() * 30,
    s:Math.random() * 1.3 + .4,
    v:.85 + Math.random() * .3
  });
}

/* POSIÇÃO DOS PLANETAS */

function pos(id, t) {
  var b = BODY[id];

  if (!b.R) return {x:0,y:0};

  var a = OFF[id] + t * 6.2832 / b.P;

  var p = b.parent ? pos(b.parent, t) : {x:0,y:0};

  return {
    x:p.x + b.R * Math.cos(a),
    y:p.y + b.R * Math.sin(a) * ty
  };
}

function S(p) {
  return {
    x:W / 2 + (p.x - cam.x) * zoom,
    y:H / 2 + (p.y - cam.y) * zoom
  };
}

/* ANÉIS DE SATURNO */

function ring(sx, sy, rr, front) {
  ctx.save();

  ctx.translate(sx, sy);
  ctx.rotate(-.22);

  var a0 = front ? 0 : Math.PI;
  var a1 = front ? Math.PI : Math.PI * 2;

  ctx.lineCap = "butt";

  ctx.strokeStyle = "rgba(236,212,160,.8)";
  ctx.lineWidth = rr * .3;

  ctx.beginPath();
  ctx.ellipse(0, 0, rr * 1.95, rr * 1.95 * .34, 0, a0, a1);
  ctx.stroke();

  ctx.strokeStyle = "rgba(200,170,120,.65)";
  ctx.lineWidth = rr * .14;

  ctx.beginPath();
  ctx.ellipse(0, 0, rr * 1.55, rr * 1.55 * .34, 0, a0, a1);
  ctx.stroke();

  ctx.restore();
}

/* DESENHO DOS PLANETAS */

function drawBody(id, p) {
  var b = BODY[id];
  var s = S(p);

  var rr = Math.max(b.r * zoom, id === "sol" ? 18 : 10);

  if (hover === id) rr *= 1.1;

  if (
    s.x < -rr * 3 ||
    s.x > W + rr * 3 ||
    s.y < -rr * 3 ||
    s.y > H + rr * 3
  ) return;

  drawn.push({
    id:id,
    x:s.x,
    y:s.y,
    r:rr
  });

  if (b.ring) ring(s.x, s.y, rr, false);

  // Brilho externo
  ctx.save();

  ctx.shadowColor = b.c[0];
  ctx.shadowBlur = rr * (id === "sol" ? 1.2 : .7);

  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(s.x, s.y, rr, 0, 6.2832);
  ctx.fill();

  ctx.restore();

  // Imagem ou aparência padrão
  ctx.save();

  ctx.beginPath();
  ctx.arc(s.x, s.y, rr, 0, 6.2832);
  ctx.clip();

  var im = imgs[id];

  if (im) {
    var sc = Math.max(
      2 * rr / im.width,
      2 * rr / im.height
    );

    var dw = im.width * sc;
    var dh = im.height * sc;

    var top = s.y - rr;

    if (dh > 2 * rr) {
      top = s.y - rr - (dh - 2 * rr) * .3;
    }

    ctx.drawImage(im, s.x - dw / 2, top, dw, dh);

  } else {
    var g = ctx.createRadialGradient(
      s.x - rr * .3,
      s.y - rr * .3,
      rr * .1,
      s.x,
      s.y,
      rr
    );

    g.addColorStop(0, b.c[0]);
    g.addColorStop(1, b.c[1]);

    ctx.fillStyle = g;
    ctx.fillRect(s.x - rr, s.y - rr, rr * 2, rr * 2);

    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.font = Math.round(rr * .9) + "px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(id === "sol" ? "✦" : "♥", s.x, s.y + rr * .05);
  }

  // Sombra esférica
  if (id !== "sol") {
    var sh = ctx.createRadialGradient(
      s.x - rr * .4,
      s.y - rr * .4,
      rr * .2,
      s.x,
      s.y,
      rr * 1.15
    );

    sh.addColorStop(0, "rgba(255,255,255,.10)");
    sh.addColorStop(.6, "rgba(0,0,0,0)");
    sh.addColorStop(1, "rgba(0,0,10,.42)");

    ctx.fillStyle = sh;
    ctx.fillRect(s.x - rr, s.y - rr, rr * 2, rr * 2);
  }

  ctx.restore();

  // Contorno
  ctx.lineWidth = id === "sol" ? 3 : 1.5;

  ctx.strokeStyle = id === "sol"
    ? "rgba(255,200,80,.9)"
    : "rgba(255,255,255,.5)";

  ctx.beginPath();
  ctx.arc(s.x, s.y, rr, 0, 6.2832);
  ctx.stroke();

  if (b.ring) ring(s.x, s.y, rr, true);

  // Nome do planeta
  var fs = Math.max(11, Math.min(15, rr * .5));

  ctx.font = "600 " + fs + "px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.save();

  ctx.shadowColor = "rgba(0,0,0,.9)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "rgba(255,255,255,.92)";

  ctx.fillText(
    item(id).name,
    s.x,
    s.y + rr + (b.ring ? rr * .55 : 0) + fs + 4
  );

  ctx.restore();
}

/* ANIMAÇÃO PRINCIPAL */

var last = performance.now();

function frame(now) {
  var dt = Math.min(.05, (now - last) / 1000);
  last = now;

  if (!paused) T += dt * speed;

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // Estrelas
  for (var i = 0; i < stars.length; i++) {
    var st = stars[i];

    var a = .35 + .45 * Math.sin(now / 800 + st.p);

    ctx.fillStyle = "rgba(255,255,255," + a.toFixed(2) + ")";

    var x = ((st.x * W - cam.x * zoom * .03) % W + W) % W;
    var y = ((st.y * H - cam.y * zoom * .03) % H + H) % H;

    ctx.fillRect(x, y, st.s, st.s);
  }

  // Órbitas
  ctx.strokeStyle = "rgba(255,255,255,.11)";
  ctx.lineWidth = 1;

  var c0 = S({x:0,y:0});

  DEF.forEach(function(d) {
    var b = BODY[d.id];

    if (!b.R || b.parent) return;

    ctx.beginPath();

    ctx.ellipse(
      c0.x,
      c0.y,
      b.R * zoom,
      b.R * ty * zoom,
      0,
      0,
      6.2832
    );

    ctx.stroke();
  });

  // Órbita da Lua
  var ep = S(pos("terra", T));

  ctx.strokeStyle = "rgba(255,255,255,.1)";

  ctx.beginPath();

  ctx.ellipse(
    ep.x,
    ep.y,
    BODY.lua.R * zoom,
    BODY.lua.R * ty * zoom,
    0,
    0,
    6.2832
  );

  ctx.stroke();

  // Cinturão de asteroides
  ctx.fillStyle = "rgba(200,185,165,.55)";

  for (var k = 0; k < belt.length; k++) {
    var bt = belt[k];
    var ang = bt.a + T * .02 * bt.v;

    var q = S({
      x:bt.R * Math.cos(ang),
      y:bt.R * Math.sin(ang) * ty
    });

    ctx.fillRect(q.x, q.y, bt.s, bt.s);
  }

  // Brilho do Sol
  var pulse = 1 + .04 * Math.sin(now / 900);
  var gr = Math.max(BODY.sol.r * zoom, 18) * 3.2 * pulse;

  var gg = ctx.createRadialGradient(
    c0.x, c0.y, 0,
    c0.x, c0.y, gr
  );

  gg.addColorStop(0, "rgba(255,210,110,.45)");
  gg.addColorStop(.4, "rgba(255,150,60,.15)");
  gg.addColorStop(1, "rgba(255,120,40,0)");

  ctx.fillStyle = gg;
  ctx.fillRect(c0.x - gr, c0.y - gr, gr * 2, gr * 2);

  // Planetas organizados pela profundidade
  drawn = [];

  var list = DEF.map(function(d) {
    return {
      id:d.id,
      p:pos(d.id, T)
    };
  });

  list.sort(function(a, b) {
    return a.p.y - b.p.y;
  });

  list.forEach(function(o) {
    drawBody(o.id, o.p);
  });

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

/* CONTROLES DE CÂMERA */

function clampCam() {
  var mx = 660;
  var my = 660 * ty + 60;

  cam.x = Math.max(-mx, Math.min(mx, cam.x));
  cam.y = Math.max(-my, Math.min(my, cam.y));
}

function setZoom(z, sx, sy) {
  z = Math.max(minZ, Math.min(maxZ, z));

  var wx = (sx - W / 2) / zoom + cam.x;
  var wy = (sy - H / 2) / zoom + cam.y;

  zoom = z;
  userZoomed = true;

  cam.x = wx - (sx - W / 2) / zoom;
  cam.y = wy - (sy - H / 2) / zoom;

  clampCam();
}

function hit(x, y) {
  for (var i = drawn.length - 1; i >= 0; i--) {
    var d = drawn[i];

    if (Math.hypot(x - d.x, y - d.y) <= d.r + 4) {
      return d.id;
    }
  }

  return null;
}

/* MOUSE E TOQUE */

var ptrs = {};
var moved = 0;
var pinchD = 0;

function ptrList() {
  return Object.keys(ptrs).map(function(k) {
    return ptrs[k];
  });
}

cv.addEventListener("pointerdown", function(e) {
  try {
    cv.setPointerCapture(e.pointerId);
  } catch(_) {}

  ptrs[e.pointerId] = {
    x:e.clientX,
    y:e.clientY
  };

  moved = 0;

  if (ptrList().length === 2) {
    var l = ptrList();

    pinchD = Math.hypot(
      l[0].x - l[1].x,
      l[0].y - l[1].y
    );
  }

  cv.style.cursor = "grabbing";
});

cv.addEventListener("pointermove", function(e) {
  var p = ptrs[e.pointerId];

  if (!p) {
    hover = hit(e.clientX, e.clientY);
    cv.style.cursor = hover ? "pointer" : "grab";
    return;
  }

  var dx = e.clientX - p.x;
  var dy = e.clientY - p.y;

  p.x = e.clientX;
  p.y = e.clientY;

  moved += Math.abs(dx) + Math.abs(dy);

  var l = ptrList();

  if (l.length === 1) {
    cam.x -= dx / zoom;
    cam.y -= dy / zoom;
    clampCam();

  } else if (l.length === 2) {
    var d = Math.hypot(
      l[0].x - l[1].x,
      l[0].y - l[1].y
    );

    if (pinchD) {
      setZoom(
        zoom * d / pinchD,
        (l[0].x + l[1].x) / 2,
        (l[0].y + l[1].y) / 2
      );
    }

    pinchD = d;
  }
});

function up(e) {
  var was = ptrList().length;

  if (was === 1 && moved < 8 && ptrs[e.pointerId]) {
    var id = hit(e.clientX, e.clientY);

    if (id) openModal(id);
  }

  delete ptrs[e.pointerId];
  pinchD = 0;

  cv.style.cursor = "grab";
}

cv.addEventListener("pointerup", up);

cv.addEventListener("pointercancel", function(e) {
  delete ptrs[e.pointerId];
  pinchD = 0;
});

cv.addEventListener("pointerleave", function() {
  hover = null;
});

cv.addEventListener("wheel", function(e) {
  e.preventDefault();

  setZoom(
    zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12),
    e.clientX,
    e.clientY
  );
}, {passive:false});

/* BOTÕES */

$("bIn").onclick = function() {
  setZoom(zoom * 1.3, W / 2, H / 2);
};

$("bOut").onclick = function() {
  setZoom(zoom / 1.3, W / 2, H / 2);
};

$("bHome").onclick = function() {
  userZoomed = false;
  zoom = fit;
  cam.x = 0;
  cam.y = 0;
};

$("bPause").onclick = function() {
  paused = !paused;
  this.textContent = paused ? "▶" : "⏸";
};

$("spd").oninput = function() {
  speed = parseFloat(this.value);
};

/* MODAL DAS LEMBRANÇAS */

var cur = 0;

function showModal(i) {
  cur = (i + DEF.length) % DEF.length;

  var id = DEF[cur].id;
  var it = item(id);
  var img = $("mimg");

  if (it.photo) {
    img.src = it.photo;
    img.style.display = "block";
    $("mph").style.display = "none";
  } else {
    img.removeAttribute("src");
    img.style.display = "none";
    $("mph").style.display = "block";
  }

  $("mname").textContent = it.name;
  $("mmsg").textContent = it.msg;
  $("mmsg").style.display = it.msg ? "block" : "none";

  $("mcount").textContent = (cur + 1) + " / " + DEF.length;
}

function openModal(id) {
  var i = DEF.map(function(d) {
    return d.id;
  }).indexOf(id);

  showModal(i);
  $("modal").classList.add("show");
}

function closeModal() {
  $("modal").classList.remove("show");
}

$("mx").onclick = closeModal;

$("modal").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});

$("mprev").onclick = function() {
  showModal(cur - 1);
};

$("mnext").onclick = function() {
  showModal(cur + 1);
};

document.addEventListener("keydown", function(e) {
  var open = $("modal").classList.contains("show");

  if (e.key === "Escape") {
    closeModal();
    $("panel").classList.remove("open");
  }

  if (open && e.key === "ArrowLeft") showModal(cur - 1);
  if (open && e.key === "ArrowRight") showModal(cur + 1);
});

/* ABERTURA */

$("enter").onclick = function() {
  $("intro").classList.add("hide");
  $("hint").style.opacity = ".6";

  setTimeout(function() {
    $("hint").style.opacity = "";
  }, 7000);

  if (canEdit && !cfg.saved) {
    $("panel").classList.add("open");
  }
};

/* EDITOR */

var canEdit = !cfg.locked || location.hash === "#editar";

if (!canEdit) {
  $("btnEdit").style.display = "none";
} else if (!cfg.saved) {
  $("btnEdit").classList.add("pulse");
}

$("btnEdit").onclick = function() {
  $("panel").classList.toggle("open");
  this.classList.remove("pulse");
};

$("pclose").onclick = function() {
  $("panel").classList.remove("open");
};

function refreshThumbs() {
  var ths = document.querySelectorAll("#list .th");

  cfg.items.forEach(function(it, i) {
    var t = ths[i];

    if (!t) return;

    if (it.photo) {
      t.style.backgroundImage = 'url("' + it.photo + '")';
      t.textContent = "";
    } else {
      t.style.backgroundImage = "none";
      t.textContent = it.id === "sol" ? "✦" : "♥";
    }
  });
}

/* CONVERTER FOTO EM IMAGEM EMBUTIDA */

function fileToData(file, cb) {
  var fr = new FileReader();

  fr.onload = function() {
    var im = new Image();

    im.onload = function() {
      var m = 900;

      var s = Math.min(
        1,
        m / Math.max(im.width, im.height)
      );

      var c = document.createElement("canvas");

      c.width = Math.round(im.width * s);
      c.height = Math.round(im.height * s);

      c.getContext("2d").drawImage(
        im,
        0,
        0,
        c.width,
        c.height
      );

      cb(c.toDataURL("image/jpeg", .86));
    };

    im.src = fr.result;
  };

  fr.readAsDataURL(file);
}

/* LISTA EDITÁVEL */

function buildList() {
  var L = $("list");

  L.innerHTML = "";

  cfg.items.forEach(function(it) {
    var el = document.createElement("div");

    el.className = "it";

    el.innerHTML =
      '<div class="th"></div>' +
      '<div class="f">' +
        '<input type="text" class="nm" maxlength="40">' +
        '<textarea class="ms" rows="2" maxlength="400" placeholder="Mensagem ou lembrança (opcional)"></textarea>' +
        '<div class="row">' +
          '<label class="btn">📷 Foto<input type="file" accept="image/*" hidden></label>' +
          '<button type="button" class="btn rm">Remover</button>' +
        '</div>' +
      '</div>';

    var nm = el.querySelector(".nm");
    var ms = el.querySelector(".ms");
    var fi = el.querySelector('input[type=file]');
    var rm = el.querySelector(".rm");

    nm.value = it.name;
    ms.value = it.msg;

    nm.oninput = function() {
      it.name = nm.value;
      save();
    };

    ms.oninput = function() {
      it.msg = ms.value;
      save();
    };

    fi.onchange = function() {
      var f = fi.files && fi.files[0];

      if (!f) return;

      fileToData(f, function(data) {
        it.photo = data;
        loadImg(it);
        refreshThumbs();
        save();
        fi.value = "";
      });
    };

    rm.onclick = function() {
      it.photo = "";
      imgs[it.id] = null;
      refreshThumbs();
      save();
    };

    L.appendChild(el);
  });

  refreshThumbs();
}

if (canEdit) {
  buildList();

  [
    ["fTitle","title"],
    ["fSub","sub"],
    ["fSign","sign"]
  ].forEach(function(p) {
    var f = $(p[0]);

    f.value = cfg[p[1]];

    f.oninput = function() {
      cfg[p[1]] = f.value;
      applyTexts();
      save();
    };
  });
}

/* EXPORTAR ARQUIVOS HTML */

function download(name, html) {
  var blob = new Blob(
    [html],
    {type:"text/html;charset=utf-8"}
  );

  var a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download = name;

  document.body.appendChild(a);
  a.click();

  setTimeout(function() {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1500);
}

function exportHTML(locked) {
  var out = JSON.parse(JSON.stringify(cfg));

  out.saved = true;
  out.locked = locked;

  var clone = document.documentElement.cloneNode(true);

  clone.querySelector("#list").innerHTML = "";
  clone.querySelector("#panel").classList.remove("open");
  clone.querySelector("#modal").classList.remove("show");
  clone.querySelector("#intro").classList.remove("hide");
  clone.querySelector("#btnEdit").classList.remove("pulse");

  clone.querySelector("title").textContent =
    cfg.title || "Nosso Universo";

  clone.querySelector("#config").textContent =
    JSON.stringify(out).replace(/</g, "\\u003c");

  var html = "<!doctype html>\n" + clone.outerHTML;

  download(
    locked
      ? "nosso-universo.html"
      : "nosso-universo-editavel.html",
    html
  );
}

$("exFinal").onclick = function() {
  exportHTML(true);
};

$("exEdit").onclick = function() {
  exportHTML(false);
};

})();
