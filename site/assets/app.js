/* Sikh University — static engine. Renders home, catalogue, and course viewer from courses.json. */
(function () {
  "use strict";
  var DATA = "assets/data/courses.json";
  var PREFIX = "su_v1_";
  function load(k, d) { try { var v = localStorage.getItem(PREFIX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) {} }
  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function qs(k) { return new URLSearchParams(location.search).get(k); }
  function getData() { return fetch(DATA).then(function (r) { return r.json(); }); }
  function topicName(data, id) { var t = data.topics.filter(function (x) { return x.id === id; })[0]; return t ? t.name : id; }

  function aiBadge(c) { return c.aiCreated ? '<span class="pill ai" title="Drafted by AI; reviewed by a Sikh University editor">Created by AI</span>' : ""; }
  function statusPill(c) { return c.status === "published" ? '<span class="pill live">Available</span>' : '<span class="pill dev">In development</span>'; }
  function coursePassed(id) { return !!load("passed_" + id, false); }
  function prereqOf(data, c) {
    var sib = data.courses.filter(function (x) { return x.status === "published" && x.topic === c.topic && x.level < c.level; })
      .sort(function (a, b) { return b.level - a.level; });
    return sib[0] || null;
  }
  function isLocked(data, c) { var p = prereqOf(data, c); return !!(p && !coursePassed(p.id)); }
  function gatePill(data, c) {
    if (coursePassed(c.id)) return '<span class="pill live">Passed ✓</span>';
    if (isLocked(data, c)) return '<span class="pill dev">🔒 Locked</span>';
    return "";
  }

  function courseCard(data, c) {
    var a = el("a", "card");
    a.href = "course.html?id=" + encodeURIComponent(c.id);
    a.innerHTML = '<div class="meta"><span class="pill topic">' + esc(topicName(data, c.topic)) + '</span>'
      + '<span class="pill level">' + esc(String(c.level)) + " level</span>" + statusPill(c) + gatePill(data, c) + aiBadge(c) + "</div>"
      + "<h3>" + esc(c.title) + "</h3>"
      + '<div class="meta">Prof. ' + esc(c.professor) + "</div>"
      + "<p>" + esc(c.summary) + "</p>";
    return a;
  }

  function initHome(root, data) {
    var pub = data.courses.filter(function (c) { return c.status === "published"; });
    var feat = pub.concat(data.courses.filter(function (c) { return c.status !== "published"; })).slice(0, 6);
    root.appendChild(el("h2", null, "Browse by topic"));
    var tg = el("div", "grid three");
    data.topics.forEach(function (t) {
      var a = el("a", "card topic-card"); a.href = "catalog.html#" + t.id;
      a.innerHTML = "<h3>" + esc(t.name) + "</h3><p>" + esc(t.blurb) + "</p>";
      tg.appendChild(a);
    });
    root.appendChild(tg);
    root.appendChild(el("h2", null, "Courses"));
    var cg = el("div", "grid three");
    feat.forEach(function (c) { cg.appendChild(courseCard(data, c)); });
    root.appendChild(cg);
    root.appendChild(el("p", "muted disclaimer", "Courses marked “Created by AI” are AI-drafted and reviewed by a Sikh University editor for accuracy. Sacred content is handled with care; report any correction via the footer."));
  }

  function initCatalog(root, data) {
    root.appendChild(el("h2", null, "Course catalogue"));
    var filt = el("div", "filters");
    var current = (location.hash || "").replace("#", "") || "all";
    var grid = el("div", "grid three");
    function render() {
      grid.innerHTML = "";
      var list = current === "all" ? data.courses : data.courses.filter(function (c) { return c.topic === current; });
      list.sort(function (a, b) { return a.level - b.level; });
      if (!list.length) { grid.appendChild(el("p", "muted", "No courses in this topic yet.")); }
      list.forEach(function (c) { grid.appendChild(courseCard(data, c)); });
      Array.prototype.forEach.call(filt.children, function (b) { b.classList.toggle("on", b.dataset.t === current); });
    }
    function mkBtn(id, name) { var b = el("button", null, esc(name)); b.dataset.t = id; b.onclick = function () { current = id; location.hash = id === "all" ? "" : id; render(); }; return b; }
    filt.appendChild(mkBtn("all", "All"));
    data.topics.forEach(function (t) { filt.appendChild(mkBtn(t.id, t.name)); });
    root.appendChild(filt); root.appendChild(grid);
    render();
  }

  function initCourse(root, data) {
    var c = data.courses.filter(function (x) { return x.id === qs("id"); })[0];
    if (!c) { root.innerHTML = '<p class="muted">Course not found. <a href="catalog.html">Back to catalogue</a>.</p>'; return; }
    var head = el("div", "course-head");
    head.innerHTML = '<div class="meta"><a href="catalog.html">← Catalogue</a> &nbsp;·&nbsp; <span class="pill topic">' + esc(topicName(data, c.topic)) + '</span>'
      + '<span class="pill level">' + esc(String(c.level)) + " level</span>" + statusPill(c) + aiBadge(c) + "</div>"
      + "<h1>" + esc(c.title) + "</h1><div class='meta'>Professor: " + esc(c.professor) + " &nbsp;·&nbsp; Source: " + esc(c.source || "Sikh University") + "</div>"
      + "<p class='lead'>" + esc(c.summary) + "</p>";
    root.appendChild(head);
    if (c.aiCreated) root.appendChild(el("div", "callout disclaimer", "<strong>Created by AI.</strong> This course was drafted with AI and is reviewed by a Sikh University editor for accuracy. Found an error? Please report it so we can correct it."));

    if (isLocked(data, c)) {
      var pr = prereqOf(data, c);
      root.appendChild(el("div", "callout", '🔒 <strong>Locked.</strong> Complete <a href="course.html?id=' + esc(pr.id) + '">' + esc(pr.title) + '</a> and pass its test (80% or higher) to unlock this course.'));
      return;
    }

    if (!c.lessons || !c.lessons.length) {
      root.appendChild(el("div", "callout", "<strong>In development.</strong> This course is being written and reviewed. Check back soon."));
      return;
    }
    var doneKey = "done_" + c.id, done = load(doneKey, {});
    var layout = el("div", "course-layout");
    var side = el("div");
    var prog = el("div", "progress"); prog.innerHTML = "<span></span>"; side.appendChild(prog);
    var list = el("ul", "lesson-list");
    var body = el("div", "lesson-body");
    var cur = 0;
    function pct() { var n = c.lessons.length, d = 0; for (var i = 0; i < n; i++) if (done[i]) d++; return n ? Math.round(d / n * 100) : 0; }
    function renderSide() {
      list.innerHTML = "";
      c.lessons.forEach(function (ls, i) {
        var li = el("li"); var b = el("button", i === cur ? "on" : null,
          (done[i] ? '<span class="done-dot">✓</span>' : '<span class="muted">' + (i + 1) + ".</span>") + " " + esc(ls.title));
        b.onclick = function () { cur = i; renderLesson(); };
        li.appendChild(b); list.appendChild(li);
      });
      prog.firstChild.style.width = pct() + "%";
    }
    function renderLesson() {
      var ls = c.lessons[cur];
      body.innerHTML = "<h3>" + esc(ls.title) + "</h3>" + ls.html;
      var row = el("div", "filters");
      var mark = el("button", done[cur] ? "on" : null, done[cur] ? "✓ Completed" : "Mark complete");
      mark.onclick = function () { done[cur] = !done[cur]; if (!done[cur]) delete done[cur]; save(doneKey, done); renderSide(); renderLesson(); };
      var next = el("button", null, cur + 1 < c.lessons.length ? "Next lesson →" : "Finish");
      next.onclick = function () { if (cur + 1 < c.lessons.length) { cur++; renderLesson(); window.scrollTo({ top: 0, behavior: "smooth" }); } };
      row.appendChild(mark); row.appendChild(next);
      body.appendChild(row);
      renderSide();
    }
    side.appendChild(list); layout.appendChild(side); layout.appendChild(body);
    root.appendChild(layout);
    renderLesson();

    if (c.quiz && c.quiz.length) {
      var box = el("div", "lesson-body"); box.style.marginTop = "1.5rem"; box.id = "test";
      box.appendChild(el("h3", null, "Course test"));
      box.appendChild(el("p", "muted", "Pass with 80% or higher to complete the course and unlock the next one."));
      var form = el("div");
      c.quiz.forEach(function (q, i) {
        var fq = el("div"); fq.style.margin = ".9rem 0";
        fq.innerHTML = "<p><strong>" + (i + 1) + ". " + esc(q.q) + "</strong></p>";
        q.options.forEach(function (o, oi) {
          var lab = el("label"); lab.style.cssText = "display:block;cursor:pointer;padding:.15rem 0";
          var r = document.createElement("input"); r.type = "radio"; r.name = "tq" + i; r.value = oi; r.style.marginRight = ".5rem";
          lab.appendChild(r); lab.appendChild(document.createTextNode(o));
          fq.appendChild(lab);
        });
        form.appendChild(fq);
      });
      box.appendChild(form);
      var submit = el("button", "btn primary", coursePassed(c.id) ? "Retake test" : "Submit test");
      var result = el("div");
      submit.onclick = function () {
        var correct = 0;
        c.quiz.forEach(function (q, i) { var s = box.querySelector('input[name="tq' + i + '"]:checked'); if (s && parseInt(s.value, 10) === q.answer) correct++; });
        var score = Math.round(correct / c.quiz.length * 100);
        if (score >= 80) {
          save("passed_" + c.id, score);
          result.innerHTML = '<div class="callout" style="border-left-color:var(--ok)"><strong>Passed — ' + score + '% (' + correct + '/' + c.quiz.length + ').</strong> Course complete. The next course in this topic is now unlocked.</div>';
        } else {
          result.innerHTML = '<div class="callout"><strong>Not yet — ' + score + '% (' + correct + '/' + c.quiz.length + ').</strong> You need 80% to pass. Review the lessons and try again.</div>';
        }
        result.scrollIntoView({ behavior: "smooth", block: "nearest" });
      };
      box.appendChild(submit); box.appendChild(result);
      root.appendChild(box);
    }
  }

  function api(path, opts) {
    opts = opts || {};
    opts.credentials = "same-origin";
    opts.headers = Object.assign({ "content-type": "application/json" }, opts.headers || {});
    return fetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, data: j }; });
    }).catch(function () { return { ok: false, status: 0, data: {} }; });
  }
  function injectAuthNav() {
    var nav = document.querySelector(".nav-inner");
    if (!nav || nav.querySelector(".auth-added")) return;
    function add(href, text, onclick) { var a = document.createElement("a"); a.className = "auth-added"; a.href = href; a.textContent = text; if (onclick) a.onclick = onclick; nav.appendChild(a); }
    function render(u) {
      var sp = document.createElement("span"); sp.className = "spacer auth-added"; nav.appendChild(sp);
      if (u) {
        add("teach.html", (u.role === "teacher" || u.role === "admin") ? "Teach" : "Become a teacher");
        if (u.role === "admin") add("admin.html", "Admin");
        add("#", "Sign out", function (e) { e.preventDefault(); fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).then(function () { location.href = "index.html"; }); });
      } else { add("login.html", "Sign in"); }
    }
    fetch("/api/me", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : { user: null }; }).then(function (d) { render(d && d.user); }).catch(function () { render(null); });
  }

  function initLogin(root) {
    root.innerHTML = "";
    root.appendChild(el("h2", null, "Sign in"));
    root.appendChild(el("p", "lead", "Enter your email and we'll send a magic sign-in link — no password needed."));
    var err = new URLSearchParams(location.search).get("error");
    if (err) root.appendChild(el("div", "callout", "<strong>" + esc(err) + "</strong>"));
    var form = el("div", "contact-form");
    var inp = document.createElement("input"); inp.type = "email"; inp.placeholder = "you@example.com"; inp.required = true;
    var lab = el("label", null, "Email"); lab.appendChild(inp);
    var btn = el("button", "btn primary", "Send magic link");
    var out = el("div");
    form.appendChild(lab); form.appendChild(btn); form.appendChild(out); root.appendChild(form);
    btn.onclick = function () {
      var email = inp.value.trim(); if (!email) { out.innerHTML = '<p class="muted">Enter your email.</p>'; return; }
      btn.disabled = true; btn.textContent = "Sending…";
      api("/api/auth/request", { method: "POST", body: JSON.stringify({ email: email }) }).then(function (r) {
        btn.disabled = false; btn.textContent = "Send magic link";
        if (!r.ok) { out.innerHTML = '<div class="callout"><strong>' + esc((r.data && r.data.error) || "Sign-in isn't available yet (backend not deployed).") + '</strong></div>'; return; }
        if (r.data.sent) out.innerHTML = '<div class="callout" style="border-left-color:var(--ok)"><strong>Check your email.</strong> A sign-in link was sent to ' + esc(email) + ' (expires in 15 minutes).</div>';
        else out.innerHTML = '<div class="callout"><strong>Dev mode</strong> (email not configured yet): <a href="' + esc(r.data.devLink) + '">click here to sign in</a>.</div>';
      });
    };
  }

  function initTeach(root) {
    root.innerHTML = ""; root.appendChild(el("h2", null, "Teach at Sikh University"));
    api("/api/me").then(function (r) {
      var u = r.ok && r.data.user;
      if (!u) { root.appendChild(el("div", "callout", "Please <a href='login.html'>sign in</a> first, then apply to teach.")); return; }
      if (u.role === "teacher" || u.role === "admin") { root.appendChild(el("div", "callout", "You're an approved <strong>" + esc(u.role) + "</strong>. Course-authoring tools are the next step.")); return; }
      root.appendChild(el("p", "lead", "Are you a scholar or knowledgeable teacher? Apply to author and maintain courses. Each application is reviewed by an admin."));
      var form = el("div", "contact-form");
      var bg = document.createElement("textarea"); bg.rows = 6; bg.placeholder = "Your background, qualifications, and area(s) of expertise.";
      var co = document.createElement("textarea"); co.rows = 3; co.placeholder = "What course(s) would you like to teach?";
      var lb = el("label", null, "Your background"); lb.appendChild(bg);
      var lc = el("label", null, "Courses you'd like to teach"); lc.appendChild(co);
      var btn = el("button", "btn primary", "Submit application"); var out = el("div");
      form.appendChild(lb); form.appendChild(lc); form.appendChild(btn); form.appendChild(out); root.appendChild(form);
      btn.onclick = function () {
        if (!bg.value.trim()) { out.innerHTML = '<p class="muted">Tell us about your background.</p>'; return; }
        btn.disabled = true;
        api("/api/teacher/apply", { method: "POST", body: JSON.stringify({ background: bg.value, courses: co.value }) }).then(function (r) {
          if (r.ok) form.innerHTML = '<div class="callout" style="border-left-color:var(--ok)"><strong>Application submitted.</strong> An admin will review it and you\'ll be notified by email.</div>';
          else { btn.disabled = false; out.innerHTML = '<div class="callout"><strong>' + esc((r.data && r.data.error) || "Error") + '</strong></div>'; }
        });
      };
    });
  }

  function initAdmin(root) {
    root.innerHTML = ""; root.appendChild(el("h2", null, "Admin — teacher applications"));
    api("/api/admin/applications").then(function (r) {
      if (!r.ok) { root.innerHTML = '<div class="callout">Admins only. <a href="login.html">Sign in</a> with an admin account.</div>'; return; }
      var apps = r.data.applications || [];
      if (!apps.length) { root.appendChild(el("div", "callout", "No pending applications.")); return; }
      function decide(id, decision, card) { api("/api/admin/applications", { method: "POST", body: JSON.stringify({ id: id, decision: decision }) }).then(function (rr) { if (rr.ok) card.innerHTML = '<div class="callout" style="border-left-color:var(--ok)">Application ' + decision + 'd.</div>'; }); }
      apps.forEach(function (a) {
        var c = el("div", "card");
        c.innerHTML = "<h3>" + esc(a.name || a.email) + "</h3><div class='meta'>" + esc(a.email) + "</div><p><strong>Background:</strong> " + esc(a.background || "") + "</p>" + (a.courses ? "<p><strong>Wants to teach:</strong> " + esc(a.courses) + "</p>" : "");
        var row = el("div", "filters");
        var ap = el("button", "btn primary", "Approve"); var dn = el("button", "btn", "Deny");
        ap.onclick = function () { decide(a.id, "approve", c); }; dn.onclick = function () { decide(a.id, "deny", c); };
        row.appendChild(ap); row.appendChild(dn); c.appendChild(row); root.appendChild(c);
      });
    });
  }

  function profileName() { return ((load("profile", {}) || {}).name || "").trim(); }
  function courseProgress(c) { if (!c.lessons || !c.lessons.length) return 0; var d = load("done_" + c.id, {}), n = 0; for (var k in d) if (d[k]) n++; return Math.round(n / c.lessons.length * 100); }

  function initDashboard(root, data) {
    root.innerHTML = "";
    var pub = data.courses.filter(function (c) { return c.status === "published"; });
    var completed = [], started = [], fresh = [];
    pub.forEach(function (c) { if (coursePassed(c.id)) completed.push(c); else if (courseProgress(c) > 0) started.push(c); else fresh.push(c); });
    var lessonsDone = 0; pub.forEach(function (c) { var d = load("done_" + c.id, {}); for (var k in d) if (d[k]) lessonsDone++; });

    var name = profileName();
    root.appendChild(el("h2", null, name ? "Welcome back, " + esc(name) : "My Learning"));
    // name setter
    var nameRow = el("div", "callout"); nameRow.style.display = "flex"; nameRow.style.gap = ".6rem"; nameRow.style.alignItems = "center"; nameRow.style.flexWrap = "wrap";
    nameRow.innerHTML = '<span class="muted" style="font-family:sans-serif;font-size:.9rem">Your name (shown on certificates):</span>';
    var ni = document.createElement("input"); ni.type = "text"; ni.value = name; ni.placeholder = "Your full name"; ni.style.cssText = "flex:1;min-width:180px;padding:.5rem .7rem;border:1px solid var(--border);border-radius:8px;font:inherit";
    var nb = el("button", "btn primary", "Save");
    nb.onclick = function () { var p = load("profile", {}); p.name = ni.value.trim(); save("profile", p); initDashboard(root, data); };
    nameRow.appendChild(ni); nameRow.appendChild(nb); root.appendChild(nameRow);

    var stats = el("div", "dash-stats");
    [[completed.length, "Completed"], [started.length, "In progress"], [completed.length, "Certificates"], [lessonsDone, "Lessons done"]].forEach(function (s) {
      stats.appendChild(el("div", "dash-stat", '<div class="n">' + s[0] + '</div><div class="l">' + s[1] + '</div>'));
    });
    root.appendChild(stats);

    function section(title, list, mode) {
      if (!list.length) return;
      root.appendChild(el("h3", null, title));
      var g = el("div", "grid three");
      list.forEach(function (c) {
        var a = el("a", "card"); a.href = "course.html?id=" + c.id;
        var p = courseProgress(c);
        var extra = mode === "completed"
          ? '<div style="margin-top:.5rem"><a class="btn primary" href="cert.html?course=' + c.id + '">View certificate →</a></div>'
          : (mode === "started" ? '<div class="progress" style="margin-top:.6rem"><span style="width:' + p + '%"></span></div><div class="meta">' + p + '% complete</div>' : "");
        a.innerHTML = '<div class="meta"><span class="pill topic">' + esc(topicName(data, c.topic)) + '</span><span class="pill level">' + c.level + ' level</span></div><h3>' + esc(c.title) + '</h3>' + extra;
        g.appendChild(a);
      });
      root.appendChild(g);
    }
    if (!completed.length && !started.length) root.appendChild(el("div", "callout", "You haven't started a course yet. <a href='catalog.html'>Browse the catalogue</a> and begin learning — your progress and certificates will appear here."));
    section("Continue learning", started, "started");
    section("Completed — certificates earned", completed, "completed");
    section("Start something new", fresh.slice(0, 6), "fresh");
  }

  function initCert(root, data) {
    var c = data.courses.filter(function (x) { return x.id === qs("course"); })[0];
    root.innerHTML = "";
    if (!c) { root.innerHTML = '<p class="muted">Course not found.</p>'; return; }
    if (!coursePassed(c.id)) {
      root.appendChild(el("div", "callout", "🔒 Complete <a href='course.html?id=" + c.id + "'>" + esc(c.title) + "</a> and pass its test (80%+) to earn your certificate."));
      return;
    }
    var name = profileName();
    if (!name) {
      root.appendChild(el("div", "callout", "Add your name on your <a href='dashboard.html'>dashboard</a> first — it will appear on the certificate."));
    }
    var score = load("passed_" + c.id, "");
    var cert = el("div", "cert");
    cert.innerHTML =
      '<div class="cert-inner">'
      + '<div class="cert-brand">Sikh<span>University</span></div>'
      + '<div class="cert-sub">Certificate of Completion</div>'
      + '<div class="cert-line">This certifies that</div>'
      + '<div class="cert-name">' + esc(name || "________________") + '</div>'
      + '<div class="cert-line">has successfully completed</div>'
      + '<div class="cert-course">' + esc(c.title) + '</div>'
      + '<div class="cert-meta">' + esc(topicName(data, c.topic)) + ' · Level ' + c.level + (score ? ' · Score ' + score + '%' : '') + '</div>'
      + '<div class="cert-foot"><span>Issued ' + new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) + '</span><span>sikhuniversity.pages.dev</span></div>'
      + '<div class="cert-ai">Course content created by AI and reviewed for accuracy.</div>'
      + '</div>';
    root.appendChild(cert);
    var btn = el("button", "btn primary noprint", "🖨 Print / save as PDF"); btn.onclick = function () { window.print(); };
    var row = el("div", "noprint"); row.style.marginTop = "1rem"; row.appendChild(btn); root.appendChild(row);
  }

  function initContact() {
    var form = document.getElementById("contactForm"); if (!form) return;
    if (new URLSearchParams(location.search).get("sent") === "1") {
      var t = document.getElementById("contactThanks"); if (t) t.style.display = "block";
      form.style.display = "none"; window.scrollTo(0, 0); return;
    }
    var email = atob("ZG90cy13aGlza3MuNnJAaWNsb3VkLmNvbQ==");  // dots-whisks.6r@icloud.com (obfuscated from scrapers)
    form.action = "https://formsubmit.co/" + email;
    var nxt = document.createElement("input"); nxt.type = "hidden"; nxt.name = "_next";
    nxt.value = location.origin + location.pathname + "?sent=1"; form.appendChild(nxt);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-page");
    injectAuthNav();
    if (page === "contact") { initContact(); return; }
    var root = document.getElementById("app"); if (!root) return;
    if (page === "login") { initLogin(root); return; }
    if (page === "teach") { initTeach(root); return; }
    if (page === "admin") { initAdmin(root); return; }
    getData().then(function (data) {
      if (page === "home") initHome(root, data);
      else if (page === "catalog") initCatalog(root, data);
      else if (page === "course") initCourse(root, data);
      else if (page === "dashboard") initDashboard(root, data);
      else if (page === "cert") initCert(root, data);
    }).catch(function () { root.innerHTML = '<p class="muted">Could not load courses.</p>'; });
  });
})();
