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
    if (page === "contact") { initContact(); return; }
    var root = document.getElementById("app"); if (!root) return;
    getData().then(function (data) {
      if (page === "home") initHome(root, data);
      else if (page === "catalog") initCatalog(root, data);
      else if (page === "course") initCourse(root, data);
    }).catch(function () { root.innerHTML = '<p class="muted">Could not load courses.</p>'; });
  });
})();
