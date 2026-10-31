"""Run the AI features against the demo backend and check the results.

Mock founders write ideas and answer the coach's questions (the answers are
role-played by the same OpenRouter model the backend uses), then each AI step
is checked against rule-based expectations. A judge pass, also by the model,
scores the subjective parts. Projects published during the run are deleted.

    set -a; . demo/demo.env; . demo/openrouter.env; set +a
    python3 demo/ai_eval.py            # full run
    python3 demo/ai_eval.py --no-judge # rule checks only

Results go to demo/eval/<timestamp>.json and .md.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

API = "http://localhost:8080/api"
DB = os.environ.get("DATABASE_URL", "postgresql://projectup:projectup@localhost:5433/projectup_demo")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OUT_DIR = Path(__file__).parent / "eval"

LENSES = {"本质/第一性原理", "目标用户与场景", "为什么是现在", "最小验证", "关键假设与风险", "需要什么样的伙伴"}
FOUNDER_SKILLS = {"Python", "PyTorch", "医学影像", "论文写作"}  # demo founder 林舟

# Each idea case: the idea, what the founder "knows" (the role-play stays
# consistent with it), how many question rounds to run, and expectations.
IDEA_CASES = [
    {
        "key": "chronic-care",
        "idea": "给社区医生做一个轻量的慢病随访提醒工具，他们现在还靠电话和表格跟进高血压患者，经常漏人。",
        "facts": "访谈过 2 个社区卫生服务中心的 6 位医生；每位医生每周要电话随访 80 多位高血压患者，用 Excel 记录，经常漏掉复诊。"
                 "想先做微信小程序，按复诊日期提醒医生和患者。自己会 Python 和医学影像，不会做小程序前端，也不懂基层医疗流程。",
        "rounds": 2,
        "lang": "zh",
        # Role keyword -> people in the demo pool who should be suggested for it
        "expect_people": {"小程序|前端|开发": {"周琪", "陈一", "张蔚", "唐凯"}, "临床|医疗|医生|健康": {"孙浩", "潘悦"}},
    },
    {
        "key": "textbooks",
        "idea": "做一个校园二手教材平台，让学长学姐把用过的教材按课程留给学弟学妹，每学期有大量教材被直接丢掉。",
        "facts": "问过 30 个同学，一半以上每学期丢过教材；教务处能拿到每门课的指定教材清单。"
                 "打算先在本院试点，做小程序。缺做开发的人和能在学生群里推广的运营。",
        "rounds": 1,
        "lang": "zh",
        "expect_people": {"开发|前端|小程序|后端": {"周琪", "陈一", "张蔚", "唐凯"}, "运营|推广|社群|增长": {"郑雨", "王欣"}},
    },
    {
        "key": "english",
        "idea": "A tool that helps grad students find collaborators in other departments, because our imaging lab never has anyone who understands the clinical side.",
        "facts": "Our lab has 12 grad students; last year three projects stalled waiting for clinical input. "
                 "We'd start with a simple matching page for our own department. I can do Python and imaging but not web development or recruiting.",
        "rounds": 1,
        "lang": "en",
        "expect_people": {},
    },
    {
        "key": "vague",
        "idea": "我想做一个 AI 产品，帮大学生提高效率。",
        "facts": "其实还没想清楚具体用户，只是觉得大家都很忙。",
        "rounds": 1,
        "lang": "zh",
        "shape": False,  # Only checks that the questions push for specifics
        "expect_people": {},
    },
]

# Seekers: who they are and which open role (by keyword) should top their list.
PERSONAS = [
    {"key": "seeker", "name": "陈一", "expect_role": "前端|全栈|小程序|实验工具|开发"},
    {"key": "liuyang", "name": "刘洋", "expect_role": "设计"},
    {"key": "zhaomin", "name": "赵敏", "expect_role": "统计|数据分析"},
    {"key": "sunhao", "name": "孙浩", "expect_role": "临床"},
    {"key": "zhengyu", "name": "郑雨", "expect_role": "运营|路演|商业"},
    # No open role needs hardware; a good matcher says so instead of overselling
    {"key": "wujie", "name": "吴杰", "expect_role": None, "max_score": 75},
]


# ---------- plumbing ----------

# OpenRouter rate-limits bursts; wait this long before each retry
BACKOFF_SECONDS = [10, 30, 60]
# A pause between model-backed calls keeps the run under the rate limit
PACE_SECONDS = 3


def call(method, path, token=None, body=None, timeout=150):
    """Calls the backend. A 502 means the model provider failed (often rate
    limiting), so it is retried; the time reported is the last attempt's."""
    for attempt in range(len(BACKOFF_SECONDS) + 1):
        req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None)
        req.add_header("Content-Type", "application/json")
        if token:
            req.add_header("Authorization", "Bearer " + token)
        started = time.time()
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                result = r.status, json.loads(r.read() or "{}"), time.time() - started
        except urllib.error.HTTPError as e:
            result = e.code, json.loads(e.read() or "{}"), time.time() - started
        if result[0] != 502 or attempt == len(BACKOFF_SECONDS):
            time.sleep(PACE_SECONDS)
            return result
        print(f"    backend 502 ({result[1].get('error', '')[:60]}); retrying in {BACKOFF_SECONDS[attempt]}s")
        time.sleep(BACKOFF_SECONDS[attempt])


def login(key):
    email = f"{key}@demo.projectup.local"
    status, body, _ = call("POST", "/login", body={"identifier": email, "email": email, "password": "demo1234"})
    if status != 200:
        sys.exit(f"login failed for {key}: {status} {body}")
    return body["token"]


def sql(query):
    return subprocess.run(["psql", DB, "-Atc", query], capture_output=True, text=True).stdout.strip()


def llm(system, user, temperature=0.3):
    """Calls the same OpenRouter model the backend uses; returns parsed JSON."""
    body = {
        "model": os.environ["OPENROUTER_MODEL"],
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": temperature,
        "response_format": {"type": "json_object"},
    }
    req = urllib.request.Request(OPENROUTER_URL, data=json.dumps(body).encode(), method="POST")
    req.add_header("Authorization", "Bearer " + os.environ["OPENROUTER_API_KEY"])
    req.add_header("Content-Type", "application/json")
    for attempt in range(len(BACKOFF_SECONDS) + 1):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                content = json.loads(r.read())["choices"][0]["message"]["content"]
            time.sleep(PACE_SECONDS)
            return json.loads(content[content.index("{"): content.rindex("}") + 1])
        except Exception as e:  # rate limits, timeouts or malformed replies
            if attempt == len(BACKOFF_SECONDS):
                raise RuntimeError(f"openrouter call failed: {e}")
            print(f"    openrouter: {e}; retrying in {BACKOFF_SECONDS[attempt]}s")
            time.sleep(BACKOFF_SECONDS[attempt])


# A risk that says there is no risk is as useless as an empty one
EMPTY_RISK = re.compile(r"^\s*(无|没有|暂无|none|no risk|n/?a)\s*[。.]?\s*$|^\s*(无|没有).{0,4}风险", re.I)
NUMBER = re.compile(r"\d+(?:\.\d+)?")


def invented_numbers(brief, source):
    """Numbers stated as facts in the brief that the founder never wrote."""
    claims = " ".join([brief.get(k) or "" for k in ("one_liner", "vision", "problem", "target_users")] + list(brief.get("blockers") or []))
    known = set(NUMBER.findall(source))
    return sorted(set(NUMBER.findall(claims)) - known)


def has_han(text):
    return bool(re.search(r"[一-鿿]", text or ""))


def chars(text):
    return len((text or "").strip())


class Checks:
    def __init__(self, section):
        self.section = section
        self.items = []

    def check(self, name, ok, detail=""):
        self.items.append({"section": self.section, "check": name, "ok": bool(ok), "detail": str(detail)[:300]})
        print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"  ({detail})" if detail and not ok else ""))
        return ok


# ---------- role-played founder and judge ----------

ANSWER_PROMPT = """You role-play a student founder answering a thinking coach. Stay consistent with the facts you are given and do not invent
numbers beyond them. Where the facts don't cover a question, say honestly what you don't know yet. Answer each question in 1-3 sentences,
in the same language as the questions. Return JSON: {"answers": ["...", "...", "..."]} with one answer per question, in order."""

JUDGE_PROMPT = """You review the output of an AI feature in a team-matching app for students. Be strict and concrete.
Return JSON: {"score": 1-5, "issues": ["short concrete issue", ...]} where 5 means you would ship it as is."""


def answer_questions(case, questions):
    user = f"Idea: {case['idea']}\nFacts you know: {case['facts']}\n\nQuestions:\n" + "\n".join(f"{i+1}. {q['question']}" for i, q in enumerate(questions))
    answers = llm(ANSWER_PROMPT, user, temperature=0.5).get("answers", [])
    return (answers + ["还不确定。"] * 3)[: len(questions)]


def judge(task, payload):
    # A failed judge call is recorded, not fatal: the rule checks still stand
    try:
        return llm(JUDGE_PROMPT, f"{task}\n\n{json.dumps(payload, ensure_ascii=False, indent=1)}", temperature=0)
    except RuntimeError as e:
        return {"score": None, "issues": [f"judge unavailable: {e}"]}


# ---------- the runs ----------

def run_recommendations(personas, use_judge):
    results = []
    for p in personas:
        print(f"\n[recommend] {p['name']} ({p['key']})")
        c = Checks(f"recommend:{p['key']}")
        status, body, took = call("GET", "/match/recommended-posts?lang=zh&refresh=1", login(p["key"]))
        matches = body.get("matches", []) if status == 200 else []
        c.check("request succeeds", status == 200, body.get("error"))
        c.check("at most 5 matches", len(matches) <= 5, len(matches))
        c.check("each project listed once", len({m["post"]["post_sid"] for m in matches}) == len(matches))
        for m in matches:
            roles = [r["title"] for r in m["post"].get("roles") or []]
            label = f"{m['post']['title']} / {m['role']}"
            c.check(f"role exists on the project: {label}", m["role"] in roles, roles)
            c.check(f"reason and risk are short and filled: {label}", 0 < chars(m["reason"]) <= 60 and 0 < chars(m["risk"]) <= 60, f"{chars(m['reason'])}/{chars(m['risk'])} chars")
            c.check(f"risk names a real concern, not 'none': {label}", not EMPTY_RISK.search(m["risk"]), m["risk"])
            c.check(f"weak fits are filtered out (score >= 60): {label}", m["score"] >= 60, m["score"])
            hours = (m["post"].get("hours_check") or {}).get(m["role"], "")
            if "enough" in hours:
                c.check(f"no hours risk when hours are enough: {label}", not re.search(r"小时|时间不足|投入时间", m["risk"]), m["risk"])
        if p["expect_role"]:
            top = matches[0]["role"] if matches else ""
            c.check(f"top match is a fitting role (/{p['expect_role']}/)", re.search(p["expect_role"], top), top or "no matches")
        if p.get("max_score") is not None:
            c.check(f"no overconfident match (score <= {p['max_score']})", all(m["score"] <= p["max_score"] for m in matches), [m["score"] for m in matches])
        judged = judge(f"Projects recommended to {p['name']}. Are the picks sensible for this person, and do the reasons and risks cite concrete, accurate evidence?",
                       {"person": p["name"], "matches": [{k: m[k] for k in ("role", "score", "reason", "risk")} | {"project": m["post"]["title"]} for m in matches]}) if use_judge else None
        results.append({"persona": p, "seconds": round(took, 1), "matches": matches, "checks": c.items, "judge": judged})
    return results


def run_idea(case, token, use_judge):
    print(f"\n[idea] {case['key']}: {case['idea'][:40]}")
    c = Checks(f"idea:{case['key']}")
    out = {"case": {k: v for k, v in case.items() if k != "expect_people"}, "rounds": [], "checks": c.items}
    rounds = []
    for n in range(case["rounds"]):
        status, body, took = call("POST", "/ideas/questions", token, {"idea": case["idea"], "rounds": rounds})
        if not c.check(f"round {n+1}: questions request succeeds", status == 200, body.get("error")):
            return out
        qs = body.get("questions", [])
        lenses = [q.get("lens") for q in qs]
        c.check(f"round {n+1}: exactly 3 questions", len(qs) == 3, len(qs))
        c.check(f"round {n+1}: lenses are distinct and from the list", len(set(lenses)) == len(lenses) and set(lenses) <= LENSES, lenses)
        earlier = {q["lens"] for r in rounds for q in r["questions"]}
        if n > 0:
            c.check(f"round {n+1}: no lens repeated from earlier rounds", not (set(lenses) & earlier), set(lenses) & earlier)
            c.check(f"round {n+1}: reflection reacts to the answers", chars(body.get("reflection")) > 0)
        else:
            c.check("round 1: no reflection yet", chars(body.get("reflection")) == 0, body.get("reflection"))
        want_zh = case["lang"] == "zh"
        c.check(f"round {n+1}: questions in the idea's language", all(has_han(q["question"]) == want_zh for q in qs), [q["question"] for q in qs])
        c.check(f"round {n+1}: each question is one short sentence", all(chars(q["question"]) <= (50 if want_zh else 160) for q in qs), [chars(q["question"]) for q in qs])
        answers = answer_questions(case, qs)
        rounds.append({"questions": qs, "answers": answers})
        out["rounds"].append({"reflection": body.get("reflection"), "questions": qs, "answers": answers, "seconds": round(took, 1)})

    if case["key"] == "vague":
        lenses = {q["lens"] for q in rounds[0]["questions"]}
        c.check("vague idea: asks who the users are or what the real problem is", lenses & {"目标用户与场景", "本质/第一性原理"}, lenses)
    if use_judge:
        out["judge_questions"] = judge(
            "A thinking coach asked these questions about a student's idea. It must never answer for the user or lead them to a conclusion; "
            "each question should make the user think harder about the specific idea, not be generic.",
            {"idea": case["idea"], "rounds": out["rounds"]})
    if case.get("shape") is False:
        return out

    status, brief, took = call("POST", "/ideas/shape", token, {"idea": case["idea"], "rounds": rounds})
    out["shape_seconds"] = round(took, 1)
    if not c.check("shape request succeeds", status == 200, brief.get("error")):
        return out
    out["brief"] = brief
    want_zh = case["lang"] == "zh"
    for field in ("title", "one_liner", "vision", "problem", "target_users", "agent_prompt"):
        c.check(f"brief.{field} is filled", chars(brief.get(field)) > 0)
    c.check("one_liner is short", chars(brief.get("one_liner")) <= (15 if want_zh else 80), brief.get("one_liner"))
    c.check("brief in the idea's language", all(has_han(brief.get(k, "")) == want_zh for k in ("title", "problem", "target_users")), [brief.get("title"), brief.get("problem", "")[:40]])
    c.check("roles in the idea's language", all(has_han(r.get("title", "")) == want_zh for r in brief.get("roles") or []), [r.get("title") for r in brief.get("roles") or []])
    source = case["idea"] + " " + " ".join(a for r in rounds for a in r["answers"])
    c.check("no numbers the founder didn't give", not invented_numbers(brief, source), invented_numbers(brief, source))
    c.check("2-3 blockers", 2 <= len(brief.get("blockers") or []) <= 3, len(brief.get("blockers") or []))
    c.check("3 next steps", len(brief.get("next_steps") or []) == 3, len(brief.get("next_steps") or []))
    c.check("3-5 topics", 3 <= len(brief.get("topics") or []) <= 5, len(brief.get("topics") or []))
    roles = brief.get("roles") or []
    c.check("2-3 roles", 2 <= len(roles) <= 3, len(roles))
    for r in roles:
        t = r.get("title", "?")
        c.check(f"role {t}: 3-5 skills", 3 <= len(r.get("skills") or []) <= 5, r.get("skills"))
        c.check(f"role {t}: realistic hours (3-15/week)", 3 <= (r.get("hours_per_week") or 0) <= 15, r.get("hours_per_week"))
        c.check(f"role {t}: first-week task filled", chars(r.get("first_week")) > 0)
        overlap = FOUNDER_SKILLS & set(r.get("skills") or [])
        c.check(f"role {t}: doesn't ask for skills the founder has", not overlap, overlap)
    if use_judge:
        out["judge_brief"] = judge(
            "A brief was shaped from the idea and the founder's own answers. It must stay faithful to what they said (flag anything invented, "
            "especially numbers), and the roles must fill real gaps in the founder's skills (founder skills: Python, PyTorch, 医学影像, 论文写作).",
            {"idea": case["idea"], "answers": [r["answers"] for r in rounds], "brief": {k: v for k, v in brief.items() if k != "agent_prompt"}})

    # Publish, then check who the matcher suggests for each role
    status, pub, _ = call("POST", f"/ideas/materialize?lang={case['lang']}", token, brief)
    if not c.check("publish succeeds", status == 200, pub.get("error")):
        return out
    out["post_sid"] = pub["post_sid"]
    status, cand, took = call("GET", f"/match/posts/{pub['post_sid']}/candidates?lang={case['lang']}", token)
    out["candidates_seconds"] = round(took, 1)
    if not c.check("candidates request succeeds", status == 200, cand.get("error")):
        return out
    out["candidates"] = cand
    matches = cand.get("matches", [])
    titles = [r["title"] for r in roles]
    per_role = {}
    for m in matches:
        per_role.setdefault(m["role"], []).append(m["candidate"]["name"])
    c.check("candidates returned within 40s (warmed at publish)", took <= 40, f"{took:.0f}s")
    c.check("every match is for an open role", all(m["role"] in titles for m in matches), set(per_role) - set(titles))
    c.check("at most 2 people per role", all(len(v) <= 2 for v in per_role.values()), per_role)
    c.check("each person under one role", len({m["candidate"]["user_id"] for m in matches}) == len(matches))
    c.check("at least one role gets someone", len(per_role) >= 1, f"{len(per_role)}/{len(titles)} roles covered")
    for m in matches:
        lang_ok = has_han(m["reason"]) == (case["lang"] == "zh")
        c.check(f"{m['candidate']['name']} ({m['role']}): reason in the UI language", lang_ok, m["reason"])
        c.check(f"{m['candidate']['name']} ({m['role']}): risk names a real concern", not EMPTY_RISK.search(m["risk"]), m["risk"])
        c.check(f"{m['candidate']['name']} ({m['role']}): score >= 60", m["score"] >= 60, m["score"])
        hours = (m["candidate"].get("hours_check") or {}).get(m["role"], "")
        if "enough" in hours:
            c.check(f"{m['candidate']['name']} ({m['role']}): no hours risk when hours are enough", not re.search(r"小时|时间不足|hours|time", m["risk"]), m["risk"])
    for pattern, people in case["expect_people"].items():
        role = next((t for t in titles if re.search(pattern, t)), None)
        if role:
            got = set(per_role.get(role, []))
            c.check(f"role {role}: an expected person is suggested ({'/'.join(sorted(people))})", got & people, got or "nobody")
    if use_judge:
        out["judge_candidates"] = judge(
            "Candidates suggested for each open role. Check the fit, and that every reason and risk cites concrete, accurate evidence from the profile.",
            {"roles": roles, "matches": [{"role": m["role"], "candidate": {k: m["candidate"].get(k) for k in ("name", "field", "skills", "hours_per_week", "hours_check")},
                                          "reason": m["reason"], "risk": m["risk"]} for m in matches]})
    return out


def cleanup(post_sids):
    for sid in post_sids:
        project = sql(f"select project_id from project_posts where sid = '{sid}'")
        if not project:
            continue
        sql(f"""begin;
            delete from group_messages where chat_id in (select id from group_chats where project_id = {project});
            delete from group_chats where project_id = {project};
            delete from project_posts where project_id = {project};
            delete from project_members where project_id = {project};
            delete from projects where project_id = {project};
            commit;""")


def write_report(results, started):
    OUT_DIR.mkdir(exist_ok=True)
    stamp = started.strftime("%Y%m%d-%H%M%S")
    (OUT_DIR / f"{stamp}.json").write_text(json.dumps(results, ensure_ascii=False, indent=1))
    checks = [c for part in results["recommendations"] + results["ideas"] for c in part["checks"]]
    passed = sum(c["ok"] for c in checks)
    lines = [f"# AI eval {started:%Y-%m-%d %H:%M}", "", f"Model: `{os.environ['OPENROUTER_MODEL']}` · {passed}/{len(checks)} checks passed", ""]
    failed = [f"- **{c['section']}** — {c['check']}: {c['detail']}" for c in checks if not c["ok"]]
    lines += ["## Failed checks", ""] + (failed or ["- none"])
    lines += ["", "## Judge scores (1-5)", ""]
    for part in results["recommendations"]:
        j = part.get("judge") or {}
        lines.append(f"- recommend:{part['persona']['key']}: {j.get('score', '-')} — {'; '.join(j.get('issues', []))}")
    for part in results["ideas"]:
        for k in ("judge_questions", "judge_brief", "judge_candidates"):
            if part.get(k):
                lines.append(f"- {part['case']['key']} {k[6:]}: {part[k].get('score')} — {'; '.join(part[k].get('issues', []))}")
    (OUT_DIR / f"{stamp}.md").write_text("\n".join(lines) + "\n")
    return OUT_DIR / f"{stamp}.md", passed, len(checks)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-judge", action="store_true")
    args = parser.parse_args()
    for var in ("OPENROUTER_API_KEY", "OPENROUTER_MODEL"):
        if not os.environ.get(var):
            sys.exit(f"{var} is not set; source demo/openrouter.env first")

    started = datetime.now()
    results = {"model": os.environ["OPENROUTER_MODEL"], "recommendations": [], "ideas": []}
    # Recommendations first, so projects published by this run don't show up in them
    results["recommendations"] = run_recommendations(PERSONAS, not args.no_judge)
    founder = login("founder")
    published = []
    try:
        for case in IDEA_CASES:
            out = run_idea(case, founder, not args.no_judge)
            results["ideas"].append(out)
            if out.get("post_sid"):
                published.append(out["post_sid"])
    finally:
        cleanup(published)
    report, passed, total = write_report(results, started)
    print(f"\n{passed}/{total} checks passed; report: {report}")


if __name__ == "__main__":
    main()
