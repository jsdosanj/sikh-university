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

  function courseOutcomes(c) {
    if (c.outcomes && c.outcomes.length) return c.outcomes;
    return (c.lessons || []).map(function (ls) { return ls.title; });
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

    var stage = el("div"); root.appendChild(stage);
    function showOverview() { stage.innerHTML = ""; renderOverview(); window.scrollTo({ top: 0, behavior: "smooth" }); }
    function showStudy(startAt) { stage.innerHTML = ""; renderStudy(startAt || 0); }

    // ---- Overview / landing ----
    function renderOverview() {
      var wrap = el("div", "course-overview");
      var prog = courseProgress(c), passed = coursePassed(c.id);

      var cta = el("div", "overview-cta");
      var btn = el("button", "btn primary", passed ? "Review course →" : (prog > 0 ? "Continue — " + prog + "% →" : "Begin course →"));
      btn.onclick = function () { showStudy(0); };
      cta.appendChild(btn);
      cta.appendChild(el("span", "meta", c.lessons.length + " lessons · " + ((c.quiz && c.quiz.length) || 0) + "-question test · pass 80% to earn a certificate"));
      if (prog > 0 && !passed) { var pb = el("div", "progress"); pb.innerHTML = '<span style="width:' + prog + '%"></span>'; cta.appendChild(pb); }
      wrap.appendChild(cta);

      var s1 = el("section", "ov-sec"); s1.appendChild(el("h2", null, "What you'll learn"));
      var ul = el("ul", "outcomes"); courseOutcomes(c).forEach(function (o) { ul.appendChild(el("li", null, esc(o))); });
      s1.appendChild(ul); wrap.appendChild(s1);

      var s2 = el("section", "ov-sec"); s2.appendChild(el("h2", null, "Syllabus"));
      var ol = el("ol", "syllabus");
      c.lessons.forEach(function (ls, i) {
        var li = el("li");
        var t = el("button", "syl-title"); t.textContent = ls.title; t.onclick = function () { showStudy(i); };
        li.appendChild(t);
        if (ls.summary) li.appendChild(el("div", "syl-desc", esc(ls.summary)));
        ol.appendChild(li);
      });
      s2.appendChild(ol); wrap.appendChild(s2);

      if (c.terms && c.terms.length) {
        var s3 = el("section", "ov-sec"); s3.appendChild(el("h2", null, "Key terms — ਸ਼ਬਦਾਵਲੀ"));
        var tbl = el("table", "terms-table");
        var tb = el("tbody");
        c.terms.forEach(function (t) { tb.appendChild(el("tr", null, '<td class="gur">' + esc(t.t) + "</td><td>" + esc(t.m) + "</td>")); });
        tbl.innerHTML = "<thead><tr><th>Term</th><th>Academic context</th></tr></thead>";
        tbl.appendChild(tb); s3.appendChild(tbl); wrap.appendChild(s3);
      }

      var s4 = el("section", "ov-sec");
      s4.innerHTML = "<h2>Assessment &amp; certificate</h2><p>Work through the " + c.lessons.length
        + " lessons, then take the end-of-course test. A score of <strong>80% or higher</strong> completes the course, unlocks the next course in this topic, and earns a printable <a href='cert.html?course=" + esc(c.id) + "'>certificate of completion</a>.</p>";
      wrap.appendChild(s4);

      if (c.references && c.references.length) {
        var s5 = el("section", "ov-sec"); s5.appendChild(el("h2", null, "References &amp; further reading"));
        var rol = el("ol", "references"); c.references.forEach(function (r) { rol.appendChild(el("li", null, esc(r))); });
        s5.appendChild(rol); wrap.appendChild(s5);
      }

      stage.appendChild(wrap);
    }

    // ---- Study view (lessons + test) ----
    function renderStudy(startAt) {
      var doneKey = "done_" + c.id, done = load(doneKey, {});
      var back = el("button", "linkish", "← Course overview"); back.onclick = showOverview;
      stage.appendChild(back);
      var layout = el("div", "course-layout");
      var side = el("div");
      var prog = el("div", "progress"); prog.innerHTML = "<span></span>"; side.appendChild(prog);
      var list = el("ul", "lesson-list");
      var body = el("div", "lesson-body");
      var cur = startAt;
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
        var next = el("button", null, cur + 1 < c.lessons.length ? "Next lesson →" : "Go to test ↓");
        next.onclick = function () {
          if (cur + 1 < c.lessons.length) { cur++; renderLesson(); window.scrollTo({ top: 0, behavior: "smooth" }); }
          else { var t = document.getElementById("test"); if (t) t.scrollIntoView({ behavior: "smooth" }); }
        };
        row.appendChild(mark); row.appendChild(next);
        body.appendChild(row);
        renderSide();
      }
      side.appendChild(list); layout.appendChild(side); layout.appendChild(body);
      stage.appendChild(layout);
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
            result.innerHTML = '<div class="callout" style="border-left-color:var(--ok)"><strong>Passed — ' + score + '% (' + correct + '/' + c.quiz.length + ').</strong> Course complete. <a href="cert.html?course=' + esc(c.id) + '">View your certificate →</a> The next course in this topic is now unlocked.</div>';
          } else {
            result.innerHTML = '<div class="callout"><strong>Not yet — ' + score + '% (' + correct + '/' + c.quiz.length + ').</strong> You need 80% to pass. Review the lessons and try again.</div>';
          }
          result.scrollIntoView({ behavior: "smooth", block: "nearest" });
        };
        box.appendChild(submit); box.appendChild(result);
        stage.appendChild(box);
      }
    }

    showOverview();
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
      add("feedback.html", "Feedback");
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

  function initFeedback(root) {
    root.innerHTML = "";
    root.appendChild(el("h2", null, "Share your feedback"));
    root.appendChild(el("p", "lead", "Found an error in a course, have a suggestion, or want to tell us what's working? We read every message — your input shapes Sikh University."));
    if (new URLSearchParams(location.search).get("sent") === "1") {
      root.appendChild(el("div", "callout", '<strong>Thank you.</strong> Your feedback was received.'));
    }
    var courseId = qs("course") || "";
    var form = el("div", "contact-form");
    var catSel = document.createElement("select");
    [["general", "General feedback"], ["course", "About a course"], ["bug", "Report a problem"], ["suggestion", "Suggest a new course/feature"]].forEach(function (o) {
      var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; if (courseId && o[0] === "course") op.selected = true; catSel.appendChild(op);
    });
    var lcat = el("label", null, "Type"); lcat.appendChild(catSel);
    var emailInp = document.createElement("input"); emailInp.type = "email"; emailInp.placeholder = "you@example.com (optional — so we can follow up)";
    var lem = el("label", null, "Email (optional)"); lem.appendChild(emailInp);
    var msg = document.createElement("textarea"); msg.rows = 7; msg.placeholder = "Your feedback…"; if (courseId) msg.value = "Re: course \"" + courseId + "\" — ";
    var lmsg = el("label", null, "Your feedback"); lmsg.appendChild(msg);
    var btn = el("button", "btn primary", "Send feedback"); var out = el("div");
    form.appendChild(lcat); form.appendChild(lem); form.appendChild(lmsg); form.appendChild(btn); form.appendChild(out); root.appendChild(form);
    btn.onclick = function () {
      if (!msg.value.trim()) { out.innerHTML = '<p class="muted">Please enter your feedback.</p>'; return; }
      btn.disabled = true; btn.textContent = "Sending…";
      api("/api/feedback", { method: "POST", body: JSON.stringify({ message: msg.value, category: catSel.value, courseId: courseId, email: emailInp.value }) }).then(function (r) {
        btn.disabled = false; btn.textContent = "Send feedback";
        if (r.ok) { form.innerHTML = '<div class="callout" style="border-left-color:var(--ok)"><strong>Thank you.</strong> Your feedback was received — we read every message.</div>'; }
        else { out.innerHTML = '<div class="callout"><strong>' + esc((r.data && r.data.error) || "Could not send. Please try again.") + '</strong></div>'; }
      });
    };
  }

  function fmtDate(ts) { try { return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); } catch (e) { return ""; } }

  function initAdmin(root) {
    root.innerHTML = "";
    api("/api/me").then(function (me) {
      var u = me.ok && me.data.user;
      if (!u || u.role !== "admin") { root.innerHTML = '<div class="callout">Admins only. <a href="login.html">Sign in</a> with an admin account.</div>'; return; }
      root.appendChild(el("h2", null, "Admin dashboard"));
      root.appendChild(el("p", "meta", "Signed in as " + esc(u.email)));
      var tabs = el("div", "admin-tabs");
      var panel = el("div");
      var TABS = [["overview", "Overview"], ["courses", "Courses"], ["applications", "Applications"], ["feedback", "Feedback"]];
      var current = "overview";
      TABS.forEach(function (t) {
        var b = el("button", t[0] === current ? "on" : null, t[1]); b.onclick = function () { current = t[0]; draw(); };
        b.dataset.t = t[0]; tabs.appendChild(b);
      });
      root.appendChild(tabs); root.appendChild(panel);
      function draw() {
        Array.prototype.forEach.call(tabs.children, function (b) { b.classList.toggle("on", b.dataset.t === current); });
        panel.innerHTML = "<p class='muted'>Loading…</p>";
        if (current === "overview") drawOverview(panel);
        else if (current === "courses") drawCourses(panel);
        else if (current === "applications") drawApplications(panel);
        else if (current === "feedback") drawFeedback(panel);
      }
      draw();
    });
  }

  function drawOverview(panel) {
    api("/api/admin/stats").then(function (r) {
      panel.innerHTML = "";
      if (!r.ok) { panel.appendChild(el("div", "callout", "Could not load stats.")); return; }
      var t = r.data.totals || {};
      var stats = el("div", "dash-stats");
      [[t.users || 0, "Total users"], [t.enrollments || 0, "Enrollments"], [t.completions || 0, "Completions"], [t.activeSessions || 0, "Active sessions"],
       [t.teachers || 0, "Teachers"], [t.pendingApplications || 0, "Pending apps"], [t.newFeedback || 0, "New feedback"], [t.admins || 0, "Admins"]].forEach(function (s) {
        stats.appendChild(el("div", "dash-stat", '<div class="n">' + s[0] + '</div><div class="l">' + s[1] + '</div>'));
      });
      panel.appendChild(stats);
      panel.appendChild(el("h3", null, "Most popular courses"));
      var pop = r.data.popular || [];
      if (!pop.length) { panel.appendChild(el("div", "callout", "No enrollments yet. Popularity appears here once learners start courses.")); return; }
      getData().then(function (data) {
        var title = {}; data.courses.forEach(function (c) { title[c.id] = c.title; });
        var max = pop[0].learners || 1;
        var tbl = el("table", "admin-table");
        tbl.innerHTML = "<thead><tr><th>Course</th><th>Learners</th><th>Completions</th><th></th></tr></thead>";
        var tb = el("tbody");
        pop.forEach(function (p) {
          var tr = el("tr");
          tr.innerHTML = "<td>" + esc(title[p.course_id] || p.course_id) + "</td><td>" + p.learners + "</td><td>" + p.completions + "</td>"
            + '<td style="width:30%"><div class="admin-bar" style="width:' + Math.max(6, Math.round((p.learners / max) * 100)) + '%"></div></td>';
          tb.appendChild(tr);
        });
        tbl.appendChild(tb); panel.appendChild(tbl);
      });
    });
  }

  function drawCourses(panel) {
    getData().then(function (data) {
      panel.innerHTML = "";
      panel.appendChild(el("p", "meta", data.courses.length + " courses · " + data.courses.filter(function (c) { return c.status === "published"; }).length + " published · " + data.topics.length + " topics"));
      data.topics.forEach(function (tp) {
        var list = data.courses.filter(function (c) { return c.topic === tp.id; }).sort(function (a, b) { return a.level - b.level; });
        if (!list.length) return;
        panel.appendChild(el("h3", null, tp.name + " (" + list.length + ")"));
        var tbl = el("table", "admin-table");
        tbl.innerHTML = "<thead><tr><th>Title</th><th>Level</th><th>Professor</th><th>Status</th><th>Lessons</th><th></th></tr></thead>";
        var tb = el("tbody");
        list.forEach(function (c) {
          var tr = el("tr");
          var viewTd = el("td"); var vb = el("button", "linkish", "View contents"); vb.style.margin = "0";
          tr.innerHTML = "<td><strong>" + esc(c.title) + "</strong></td><td>" + c.level + "</td><td>" + esc(c.professor) + "</td><td>" + (c.status === "published" ? "Published" : "Draft") + "</td><td>" + ((c.lessons && c.lessons.length) || 0) + "</td>";
          viewTd.appendChild(vb); tr.appendChild(viewTd);
          var detail = el("tr"); var dtd = el("td"); dtd.colSpan = 6; dtd.style.padding = "0"; detail.appendChild(dtd); detail.style.display = "none";
          var open = false;
          vb.onclick = function () { open = !open; detail.style.display = open ? "" : "none"; vb.textContent = open ? "Hide contents" : "View contents"; if (open && !dtd.firstChild) dtd.appendChild(courseContents(c)); };
          tb.appendChild(tr); tb.appendChild(detail);
        });
        tbl.appendChild(tb); panel.appendChild(tbl);
      });
    });
  }

  function courseContents(c) {
    var box = el("div", "admin-course-body");
    box.appendChild(el("p", "meta", "ID: " + esc(c.id) + " · Source: " + esc(c.source || "—") + (c.aiCreated ? " · Created by AI" : "")));
    box.appendChild(el("p", null, "<strong>Summary:</strong> " + esc(c.summary)));
    if (c.terms && c.terms.length) {
      box.appendChild(el("h4", null, "Key terms"));
      var tt = el("table", "terms-table"); var ttb = el("tbody");
      c.terms.forEach(function (t) { ttb.appendChild(el("tr", null, '<td class="gur">' + esc(t.t) + "</td><td>" + esc(t.m) + "</td>")); });
      tt.innerHTML = "<thead><tr><th>Term</th><th>Meaning</th></tr></thead>"; tt.appendChild(ttb); box.appendChild(tt);
    }
    (c.lessons || []).forEach(function (ls, i) {
      box.appendChild(el("h4", null, "Lesson " + (i + 1) + ": " + esc(ls.title)));
      box.appendChild(el("div", "lesson-body", ls.html));
    });
    if (c.quiz && c.quiz.length) {
      box.appendChild(el("h4", null, "Test (" + c.quiz.length + " questions)"));
      var ol = el("ol");
      c.quiz.forEach(function (q) {
        var li = el("li");
        var opts = q.options.map(function (o, oi) { return (oi === q.answer ? "<strong>✓ " + esc(o) + "</strong>" : esc(o)); }).join(" · ");
        li.innerHTML = esc(q.q) + "<br><span class='meta'>" + opts + "</span>";
        ol.appendChild(li);
      });
      box.appendChild(ol);
    }
    if (c.references && c.references.length) {
      box.appendChild(el("h4", null, "References"));
      var rol = el("ol", "references"); c.references.forEach(function (r) { rol.appendChild(el("li", null, esc(r))); }); box.appendChild(rol);
    }
    return box;
  }

  function drawApplications(panel) {
    api("/api/admin/applications").then(function (r) {
      panel.innerHTML = "";
      if (!r.ok) { panel.appendChild(el("div", "callout", "Could not load applications.")); return; }
      var apps = r.data.applications || [];
      if (!apps.length) { panel.appendChild(el("div", "callout", "No pending applications.")); return; }
      function decide(id, decision, card) { api("/api/admin/applications", { method: "POST", body: JSON.stringify({ id: id, decision: decision }) }).then(function (rr) { if (rr.ok) card.innerHTML = '<div class="callout" style="border-left-color:var(--ok)">Application ' + decision + 'd.</div>'; }); }
      apps.forEach(function (a) {
        var card = el("div", "card");
        card.innerHTML = "<h3>" + esc(a.name || a.email) + "</h3><div class='meta'>" + esc(a.email) + " · " + fmtDate(a.created_at) + "</div><p><strong>Background:</strong> " + esc(a.background || "") + "</p>" + (a.courses ? "<p><strong>Wants to teach:</strong> " + esc(a.courses) + "</p>" : "");
        var row = el("div", "filters");
        var ap = el("button", "btn primary", "Approve"); var dn = el("button", "btn", "Deny");
        ap.onclick = function () { decide(a.id, "approve", card); }; dn.onclick = function () { decide(a.id, "deny", card); };
        row.appendChild(ap); row.appendChild(dn); card.appendChild(row); panel.appendChild(card);
      });
    });
  }

  function drawFeedback(panel) {
    api("/api/admin/feedback").then(function (r) {
      panel.innerHTML = "";
      if (!r.ok) { panel.appendChild(el("div", "callout", "Could not load feedback.")); return; }
      var fb = r.data.feedback || [];
      if (!fb.length) { panel.appendChild(el("div", "callout", "No feedback yet.")); return; }
      var tbl = el("table", "admin-table");
      tbl.innerHTML = "<thead><tr><th>Date</th><th>Type</th><th>From</th><th>Course</th><th>Message</th></tr></thead>";
      var tb = el("tbody");
      fb.forEach(function (f) {
        var tr = el("tr");
        tr.innerHTML = "<td>" + fmtDate(f.created_at) + "</td><td>" + esc(f.category || "") + "</td><td>" + esc(f.email || "—") + "</td><td>" + esc(f.course_id || "—") + "</td><td>" + esc(f.message || "") + "</td>";
        tb.appendChild(tr);
      });
      tbl.appendChild(tb); panel.appendChild(tbl);
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
      + '<div class="cert-foot"><span>Issued ' + new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) + '</span><span>sikh-university.jasvant-dosanjh.workers.dev</span></div>'
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
    if (page === "feedback") { initFeedback(root); return; }
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
