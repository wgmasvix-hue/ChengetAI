/* ChengetAi Labs — hero globe animation.
   A rotating dotted globe with arcs linking universities, research
   institutions, farms, libraries and cloud regions across Africa. */
(function () {
  "use strict";

  var canvas = document.getElementById("globe-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var W, H, CX, CY, R, dpr;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Globe sits to the right on wide screens, centred behind text on small ones
    var wide = W > 900;
    CX = wide ? W * 0.74 : W * 0.5;
    CY = H * 0.52;
    R = Math.min(W, H) * (wide ? 0.36 : 0.42);
  }
  resize();
  window.addEventListener("resize", resize);

  /* Dot sphere: fibonacci-distributed points */
  var DOTS = 420;
  var points = [];
  var golden = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < DOTS; i++) {
    var y = 1 - (i / (DOTS - 1)) * 2;
    var radius = Math.sqrt(1 - y * y);
    var theta = golden * i;
    points.push({ x: Math.cos(theta) * radius, y: y, z: Math.sin(theta) * radius });
  }

  /* Named nodes — the connected ecosystem */
  var nodes = [
    { lat: -17.8, lon: 31.0, label: "University" },     // Harare
    { lat: -1.3, lon: 36.8, label: "Research Lab" },    // Nairobi
    { lat: 6.5, lon: 3.4, label: "Library" },           // Lagos
    { lat: -26.2, lon: 28.0, label: "Cloud Region" },   // Johannesburg
    { lat: 30.0, lon: 31.2, label: "Archive" },         // Cairo
    { lat: 5.6, lon: -0.2, label: "Farm Network" },     // Accra
    { lat: 9.0, lon: 38.7, label: "College" },          // Addis Ababa
    { lat: -6.8, lon: 39.3, label: "Data Center" }      // Dar es Salaam
  ];
  nodes.forEach(function (n) {
    var la = (n.lat * Math.PI) / 180;
    var lo = (n.lon * Math.PI) / 180;
    n.x = Math.cos(la) * Math.cos(lo);
    n.y = -Math.sin(la);
    n.z = Math.cos(la) * Math.sin(lo);
  });

  /* Arcs between node pairs */
  var arcs = [];
  for (var a = 0; a < nodes.length; a++) {
    arcs.push({ from: nodes[a], to: nodes[(a + 3) % nodes.length], t: Math.random() });
  }

  var rot = 0;

  function project(p, rotY) {
    var cos = Math.cos(rotY), sin = Math.sin(rotY);
    var x = p.x * cos - p.z * sin;
    var z = p.x * sin + p.z * cos;
    return { sx: CX + x * R, sy: CY + p.y * R, z: z };
  }

  function slerp(p1, p2, t) {
    var dot = p1.x * p2.x + p1.y * p2.y + p1.z * p2.z;
    dot = Math.max(-1, Math.min(1, dot));
    var omega = Math.acos(dot);
    if (omega < 1e-4) return { x: p1.x, y: p1.y, z: p1.z };
    var so = Math.sin(omega);
    var k1 = Math.sin((1 - t) * omega) / so;
    var k2 = Math.sin(t * omega) / so;
    // Lift the arc above the surface at its midpoint
    var lift = 1 + 0.22 * Math.sin(t * Math.PI);
    return {
      x: (p1.x * k1 + p2.x * k2) * lift,
      y: (p1.y * k1 + p2.y * k2) * lift,
      z: (p1.z * k1 + p2.z * k2) * lift
    };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Halo
    var halo = ctx.createRadialGradient(CX, CY, R * 0.75, CX, CY, R * 1.5);
    halo.addColorStop(0, "rgba(34,197,94,0.10)");
    halo.addColorStop(1, "rgba(34,197,94,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(CX, CY, R * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Dot sphere
    for (var i = 0; i < points.length; i++) {
      var s = project(points[i], rot);
      if (s.z < -0.15) continue; // back-face culling with a soft edge
      var alpha = 0.12 + 0.5 * Math.max(0, s.z);
      ctx.fillStyle = "rgba(120,220,160," + alpha.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, 1.1 + s.z * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Arcs
    for (var j = 0; j < arcs.length; j++) {
      var arc = arcs[j];
      ctx.beginPath();
      var visible = false;
      for (var t = 0; t <= 1.001; t += 0.04) {
        var p = slerp(arc.from, arc.to, Math.min(t, 1));
        var sp = project(p, rot);
        if (sp.z > -0.05) visible = true;
        if (t === 0) ctx.moveTo(sp.sx, sp.sy);
        else ctx.lineTo(sp.sx, sp.sy);
      }
      if (!visible) continue;
      ctx.strokeStyle = "rgba(245,184,65,0.28)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Travelling pulse along the arc
      arc.t = (arc.t + 0.0035) % 1;
      var pp = slerp(arc.from, arc.to, arc.t);
      var ps = project(pp, rot);
      if (ps.z > -0.05) {
        ctx.fillStyle = "rgba(245,200,90,0.95)";
        ctx.beginPath();
        ctx.arc(ps.sx, ps.sy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Named nodes
    ctx.font = "600 10px 'Inter', sans-serif";
    for (var k = 0; k < nodes.length; k++) {
      var ns = project(nodes[k], rot);
      if (ns.z < 0.05) continue;
      var glow = 0.4 + 0.6 * ns.z;
      ctx.fillStyle = "rgba(52,211,153," + glow.toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(ns.sx, ns.sy, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(52,211,153,0.35)";
      ctx.beginPath();
      ctx.arc(ns.sx, ns.sy, 7, 0, Math.PI * 2);
      ctx.stroke();
      if (ns.z > 0.45 && W > 700) {
        ctx.fillStyle = "rgba(200,230,210," + (ns.z * 0.9).toFixed(2) + ")";
        ctx.fillText(nodes[k].label, ns.sx + 11, ns.sy + 3);
      }
    }
  }

  function loop() {
    rot += 0.0022;
    draw();
    requestAnimationFrame(loop);
  }

  if (reduceMotion) {
    draw(); // single static frame
  } else {
    loop();
  }
})();
