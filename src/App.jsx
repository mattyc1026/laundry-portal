import { useState, useEffect } from "react";

// ─── INITIAL DATA ────────────────────────────────────────────────────────────
const INITIAL_USERS = [
  { id: "matthewc", firstName: "Matthew", lastName: "Cunning", pin: "7420", isAdmin: true }
];

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DAY_COLORS = [
  "#22c5e0",
  "#a855f7",
  "#ef4444",
  "#f97316",
  "#84cc16",
  "#eab308",
  "#6ee7b7",
];

function getWeekStarts() {
  const base = new Date(2026, 4, 24);
  return [0, 1, 2, 3].map(i => {
    const d = new Date(base);
    d.setDate(base.getDate() + i * 7);
    return d;
  });
}

function formatWeekLabel(start) {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (start.getMonth() === end.getMonth()) {
    return `${months[start.getMonth()]} ${start.getDate()} \u2013 ${end.getDate()}`;
  }
  return `${months[start.getMonth()]} ${start.getDate()} \u2013 ${months[end.getMonth()]} ${end.getDate()}`;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function buildInitialSchedule() {
  const weeks = getWeekStarts();
  const schedule = {};
  weeks.forEach(weekStart => {
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + d);
      const key = dateKey(date);
      schedule[key] = { assignedTo: null, towels: false, blocked: false };
    }
  });

  const assignments = {
    0: { assignedTo: "__malakai__", displayName: "Malakai" },
    3: { assignedTo: "__scott_starla__", displayName: "Scott + Starla" },
    4: { assignedTo: "__alyssa_josiah__", displayName: "Alyssa + Josiah" },
    6: { assignedTo: "matthewc", displayName: "Matthew + Michael" },
  };

  const towelKeys = new Set([
    dateKey(new Date(2026, 4, 24)),
    dateKey(new Date(2026, 5, 3)),
    dateKey(new Date(2026, 5, 11)),
    dateKey(new Date(2026, 5, 20)),
  ]);

  weeks.forEach(weekStart => {
    Object.entries(assignments).forEach(([dayOffset, info]) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + parseInt(dayOffset));
      const key = dateKey(date);
      if (schedule[key]) {
        schedule[key].assignedTo = info.assignedTo;
        schedule[key].displayName = info.displayName;
        schedule[key].towels = towelKeys.has(key);
      }
    });
  });

  return schedule;
}

function loadState(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function saveState(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [users, setUsers] = useState(() => loadState("cflp_users", INITIAL_USERS));
  const [schedule, setSchedule] = useState(() => loadState("cflp_schedule", buildInitialSchedule()));
  const [requests, setRequests] = useState(() => loadState("cflp_requests", []));
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("calendar");
  const [loginStep, setLoginStep] = useState("login");
  const [toast, setToast] = useState(null);

  useEffect(() => { saveState("cflp_users", users); }, [users]);
  useEffect(() => { saveState("cflp_schedule", schedule); }, [schedule]);
  useEffect(() => { saveState("cflp_requests", requests); }, [requests]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  if (!currentUser) {
    return (
      <AuthScreen
        loginStep={loginStep}
        setLoginStep={setLoginStep}
        users={users}
        setUsers={setUsers}
        onLogin={u => { setCurrentUser(u); setView("calendar"); }}
        showToast={showToast}
        toast={toast}
      />
    );
  }

  return (
    <div style={styles.appWrap}>
      <Header currentUser={currentUser} onLogout={() => { setCurrentUser(null); setView("calendar"); }} view={view} setView={setView} requests={requests} />
      {view === "calendar" && (
        <CalendarView
          schedule={schedule}
          setSchedule={setSchedule}
          currentUser={currentUser}
          users={users}
          requests={requests}
          setRequests={setRequests}
          showToast={showToast}
        />
      )}
      {view === "requests" && (
        <RequestsView
          requests={requests}
          setRequests={setRequests}
          schedule={schedule}
          setSchedule={setSchedule}
          currentUser={currentUser}
          users={users}
          showToast={showToast}
        />
      )}
      {view === "admin" && currentUser.isAdmin && (
        <AdminView
          schedule={schedule}
          setSchedule={setSchedule}
          users={users}
          setUsers={setUsers}
          requests={requests}
          setRequests={setRequests}
          showToast={showToast}
        />
      )}
      {toast && (
        <div style={{ ...styles.toast, background: toast.type === "error" ? "#ef4444" : "#22c55e" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function AuthScreen({ loginStep, setLoginStep, users, setUsers, onLogin, showToast, toast }) {
  const [loginId, setLoginId] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [regFirst, setRegFirst] = useState("");
  const [regLast, setRegLast] = useState("");
  const [regPin, setRegPin] = useState("");
  const [regPin2, setRegPin2] = useState("");

  const derivedUsername = regFirst && regLast
    ? (regFirst.toLowerCase() + regLast[0].toLowerCase())
    : "";

  function handleLogin(e) {
    e.preventDefault();
    const user = users.find(u => u.id === loginId.toLowerCase().trim() && u.pin === loginPin);
    if (!user) { showToast("Invalid username or PIN", "error"); return; }
    onLogin(user);
  }

  function handleRegister(e) {
    e.preventDefault();
    if (!regFirst || !regLast) { showToast("Enter your full name", "error"); return; }
    if (regPin.length !== 4 || !/^\d{4}$/.test(regPin)) { showToast("PIN must be 4 digits", "error"); return; }
    if (regPin !== regPin2) { showToast("PINs don't match", "error"); return; }
    const newId = regFirst.toLowerCase() + regLast[0].toLowerCase();
    if (users.find(u => u.id === newId)) { showToast(`Username "${newId}" is taken`, "error"); return; }
    const newUser = { id: newId, firstName: regFirst, lastName: regLast, pin: regPin, isAdmin: false };
    setUsers(prev => [...prev, newUser]);
    onLogin(newUser);
    showToast(`Welcome, ${regFirst}!`);
  }

  return (
    <div style={styles.authBg}>
      <div style={styles.authCard}>
        <div style={styles.authLogo}>
          <div style={styles.authLogoMark}>CL</div>
          <div>
            <div style={styles.authTitle}>Cunning Family</div>
            <div style={styles.authSubtitle}>Laundry Portal</div>
          </div>
        </div>

        <div style={styles.tabRow}>
          <button style={{ ...styles.tab, ...(loginStep === "login" ? styles.tabActive : {}) }} onClick={() => setLoginStep("login")}>Sign In</button>
          <button style={{ ...styles.tab, ...(loginStep === "register" ? styles.tabActive : {}) }} onClick={() => setLoginStep("register")}>Register</button>
        </div>

        {loginStep === "login" ? (
          <form onSubmit={handleLogin} style={styles.form}>
            <label style={styles.label}>Username</label>
            <input style={styles.input} value={loginId} onChange={e => setLoginId(e.target.value)} autoComplete="username" />
            <label style={styles.label}>4-Digit PIN</label>
            <input style={styles.input} type="password" maxLength={4} value={loginPin} onChange={e => setLoginPin(e.target.value)} inputMode="numeric" />
            <button style={styles.authBtn} type="submit">Sign In</button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={styles.form}>
            <label style={styles.label}>First Name</label>
            <input style={styles.input} value={regFirst} onChange={e => setRegFirst(e.target.value)} />
            <label style={styles.label}>Last Name</label>
            <input style={styles.input} value={regLast} onChange={e => setRegLast(e.target.value)} />
            {derivedUsername && (
              <div style={styles.usernamePreview}>Your username will be: <strong>{derivedUsername}</strong></div>
            )}
            <label style={styles.label}>Create PIN</label>
            <input style={styles.input} type="password" maxLength={4} value={regPin} onChange={e => setRegPin(e.target.value)} inputMode="numeric" />
            <label style={styles.label}>Confirm PIN</label>
            <input style={styles.input} type="password" maxLength={4} value={regPin2} onChange={e => setRegPin2(e.target.value)} inputMode="numeric" />
            <button style={styles.authBtn} type="submit">Create Account</button>
          </form>
        )}
        {toast && (
          <div style={{ ...styles.toast, position: "relative", bottom: "auto", right: "auto", marginTop: 12, background: toast.type === "error" ? "#ef4444" : "#22c55e" }}>
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ currentUser, onLogout, view, setView, requests }) {
  const pendingCount = requests.filter(r => r.status === "pending").length;
  return (
    <div style={styles.header}>
      <div style={styles.headerLeft}>
        <div style={styles.headerLogoMark}>CL</div>
        <div>
          <div style={styles.headerTitle}>Cunning Family Laundry Portal</div>
          <div style={styles.headerSub}>Signed in as {currentUser.firstName} {currentUser.isAdmin ? "(Admin)" : ""}</div>
        </div>
      </div>
      <div style={styles.headerNav}>
        <button style={{ ...styles.navBtn, ...(view === "calendar" ? styles.navBtnActive : {}) }} onClick={() => setView("calendar")}>Calendar</button>
        <button style={{ ...styles.navBtn, ...(view === "requests" ? styles.navBtnActive : {}) }} onClick={() => setView("requests")}>
          Requests {pendingCount > 0 && <span style={styles.badge}>{pendingCount}</span>}
        </button>
        {currentUser.isAdmin && (
          <button style={{ ...styles.navBtn, ...(view === "admin" ? styles.navBtnActive : {}) }} onClick={() => setView("admin")}>Admin</button>
        )}
        <button style={styles.logoutBtn} onClick={onLogout}>Sign Out</button>
      </div>
    </div>
  );
}

// ─── CALENDAR VIEW ────────────────────────────────────────────────────────────
function CalendarView({ schedule, setSchedule, currentUser, users, requests, setRequests, showToast }) {
  const weeks = getWeekStarts();
  const [requestModal, setRequestModal] = useState(null);
  const [giveUpModal, setGiveUpModal] = useState(null);
  const [reqDays, setReqDays] = useState([]);
  const [reqMsg, setReqMsg] = useState("");

  function getDisplayName(entry, users) {
    if (!entry.assignedTo) return null;
    if (entry.displayName && entry.assignedTo.startsWith("__")) return entry.displayName;
    const u = users.find(u => u.id === entry.assignedTo);
    return u ? `${u.firstName} ${u.lastName[0]}.` : entry.displayName || entry.assignedTo;
  }

  function canRequest(key) {
    const entry = schedule[key];
    if (!entry) return false;
    if (entry.blocked || entry.assignedTo) return false;
    const already = requests.find(r => r.days.includes(key) && r.userId === currentUser.id && r.status === "pending");
    return !already;
  }

  function canGiveUp(key) {
    const entry = schedule[key];
    return entry && entry.assignedTo === currentUser.id;
  }

  function submitRequest() {
    if (!reqDays.length) { showToast("Select at least one day", "error"); return; }
    const newReq = {
      id: Date.now(),
      userId: currentUser.id,
      userName: `${currentUser.firstName} ${currentUser.lastName}`,
      days: reqDays,
      message: reqMsg,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    setRequests(prev => [...prev, newReq]);
    setRequestModal(null);
    setReqDays([]);
    setReqMsg("");
    showToast("Request submitted!");
  }

  function giveUpDay(key) {
    setSchedule(prev => ({
      ...prev,
      [key]: { ...prev[key], assignedTo: null, displayName: null, towels: false }
    }));
    setGiveUpModal(null);
    showToast("Day released and now available.");
  }

  return (
    <div style={styles.calWrap}>
      <div style={styles.calGrid}>
        {weeks.map((weekStart, wi) => (
          <div key={wi} style={styles.weekCard}>
            <div style={styles.weekHeader}>{formatWeekLabel(weekStart)}</div>
            {DAYS.map((dayLetter, di) => {
              const date = new Date(weekStart);
              date.setDate(weekStart.getDate() + di);
              const key = dateKey(date);
              const entry = schedule[key] || {};
              const displayName = getDisplayName(entry, users);
              const isMyDay = entry.assignedTo === currentUser.id;
              const canReq = canRequest(key);
              const canGive = canGiveUp(key);
              const hasPendingReq = requests.some(r => r.days.includes(key) && r.userId === currentUser.id && r.status === "pending");

              return (
                <div
                  key={di}
                  style={{
                    ...styles.dayRow,
                    background: DAY_COLORS[di],
                    opacity: entry.blocked ? 0.4 : 1,
                    outline: isMyDay ? "3px solid rgba(255,255,255,0.8)" : "none",
                    outlineOffset: "-3px",
                    cursor: (canReq || canGive) ? "pointer" : "default",
                  }}
                  onClick={() => {
                    if (canGive) setGiveUpModal({ key, date: date.toDateString() });
                    else if (canReq) {
                      setReqDays([key]);
                      setRequestModal({ date: date.toDateString() });
                    }
                  }}
                >
                  <span style={styles.dayLetter}>{dayLetter}</span>
                  <span style={styles.dayDateNum}>{date.getDate()}</span>
                  <span style={styles.dayName}>
                    {entry.blocked
                      ? "Blocked"
                      : displayName
                        ? (
                          <span style={styles.dayNameInner}>
                            {displayName}
                            {entry.towels && (
                              <span style={styles.towelBadge}>+ Towels</span>
                            )}
                          </span>
                        )
                        : (hasPendingReq ? "Pending" : (canReq ? "Available" : ""))}
                  </span>
                  {isMyDay && <span style={styles.myDayDot} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={styles.legend}>
        <span><span style={{ ...styles.legendDot, background: "#fff", border: "2px solid rgba(0,0,0,0.2)" }} /> Your day</span>
        <span><span style={styles.towelBadgeLegend}>+ Towels</span> Towels required</span>
        <span style={{ color: "#64748b" }}>Tap an available day to request it &bull; Tap your day to give it up</span>
      </div>

      {requestModal && (
        <Modal title="Request a Laundry Day" onClose={() => { setRequestModal(null); setReqDays([]); setReqMsg(""); }}>
          <p style={styles.modalText}>Select any available days and explain why you need them.</p>
          <div style={styles.modalDayGrid}>
            {Object.entries(schedule).filter(([k, v]) => !v.assignedTo && !v.blocked).map(([k]) => {
              const d = new Date(k + "T12:00:00");
              const selected = reqDays.includes(k);
              return (
                <button
                  key={k}
                  style={{ ...styles.dayPickBtn, ...(selected ? styles.dayPickBtnSel : {}) }}
                  onClick={() => setReqDays(prev => selected ? prev.filter(x => x !== k) : [...prev, k])}
                >
                  {DAY_FULL[d.getDay()].slice(0,3)} {d.getMonth()+1}/{d.getDate()}
                </button>
              );
            })}
          </div>
          <textarea
            style={styles.textarea}
            placeholder="Brief reason for your request..."
            value={reqMsg}
            onChange={e => setReqMsg(e.target.value)}
            rows={3}
          />
          <button style={styles.primaryBtn} onClick={submitRequest}>Submit Request</button>
        </Modal>
      )}

      {giveUpModal && (
        <Modal title="Give Up Your Day?" onClose={() => setGiveUpModal(null)}>
          <p style={styles.modalText}>Release <strong>{giveUpModal.date}</strong>? It will become available for others to request.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={styles.dangerBtn} onClick={() => giveUpDay(giveUpModal.key)}>Yes, Give Up Day</button>
            <button style={styles.secondaryBtn} onClick={() => setGiveUpModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── REQUESTS VIEW ────────────────────────────────────────────────────────────
function RequestsView({ requests, setRequests, schedule, setSchedule, currentUser, users, showToast }) {
  const myRequests = currentUser.isAdmin
    ? requests
    : requests.filter(r => r.userId === currentUser.id);

  function approve(reqId) {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    setSchedule(prev => {
      const updated = { ...prev };
      req.days.forEach(key => {
        if (updated[key]) {
          updated[key] = { ...updated[key], assignedTo: req.userId, displayName: null };
        }
      });
      return updated;
    });
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: "approved" } : r));
    showToast("Request approved.");
  }

  function deny(reqId) {
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: "denied" } : r));
    showToast("Request denied.");
  }

  const pending = myRequests.filter(r => r.status === "pending");
  const resolved = myRequests.filter(r => r.status !== "pending");

  return (
    <div style={styles.reqWrap}>
      <h2 style={styles.sectionTitle}>{currentUser.isAdmin ? "All Requests" : "My Requests"}</h2>
      {pending.length === 0 && <p style={styles.emptyMsg}>No pending requests.</p>}
      {pending.map(req => (
        <RequestCard key={req.id} req={req} isAdmin={currentUser.isAdmin} onApprove={approve} onDeny={deny} schedule={schedule} />
      ))}
      {resolved.length > 0 && (
        <>
          <h3 style={{ ...styles.sectionTitle, fontSize: 16, marginTop: 24 }}>Past Requests</h3>
          {resolved.map(req => (
            <RequestCard key={req.id} req={req} isAdmin={false} schedule={schedule} />
          ))}
        </>
      )}
    </div>
  );
}

function RequestCard({ req, isAdmin, onApprove, onDeny }) {
  const statusColor = { pending: "#f59e0b", approved: "#22c55e", denied: "#ef4444" };
  return (
    <div style={styles.reqCard}>
      <div style={styles.reqCardTop}>
        <span style={styles.reqUser}>{req.userName}</span>
        <span style={{ ...styles.reqStatus, background: statusColor[req.status] }}>{req.status}</span>
      </div>
      <div style={styles.reqDays}>
        {req.days.map(k => {
          const d = new Date(k + "T12:00:00");
          return <span key={k} style={styles.reqDayChip}>{DAY_FULL[d.getDay()].slice(0,3)} {d.getMonth()+1}/{d.getDate()}</span>;
        })}
      </div>
      {req.message && <p style={styles.reqMsg}>"{req.message}"</p>}
      {isAdmin && req.status === "pending" && (
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button style={styles.primaryBtn} onClick={() => onApprove(req.id)}>Approve</button>
          <button style={styles.dangerBtn} onClick={() => onDeny(req.id)}>Deny</button>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN VIEW ───────────────────────────────────────────────────────────────
function AdminView({ schedule, setSchedule, users, setUsers, requests, setRequests, showToast }) {
  const [tab, setTab] = useState("assign");
  const [selDate, setSelDate] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [towels, setTowels] = useState(false);

  const weeks = getWeekStarts();
  const allDates = [];
  weeks.forEach(ws => {
    for (let d = 0; d < 7; d++) {
      const date = new Date(ws);
      date.setDate(ws.getDate() + d);
      allDates.push(date);
    }
  });

  function handleAssign() {
    if (!selDate) { showToast("Select a date", "error"); return; }
    setSchedule(prev => ({
      ...prev,
      [selDate]: { ...prev[selDate], assignedTo: assignTo || null, displayName: null, towels, blocked: false }
    }));
    showToast(assignTo ? `Assignment saved.` : `Day cleared.`);
  }

  function toggleTowels(key) {
    setSchedule(prev => ({
      ...prev,
      [key]: { ...prev[key], towels: !prev[key]?.towels }
    }));
  }

  function toggleBlock(key) {
    setSchedule(prev => ({
      ...prev,
      [key]: { ...prev[key], blocked: !prev[key]?.blocked, assignedTo: prev[key]?.blocked ? prev[key]?.assignedTo : null }
    }));
  }

  const registeredUsers = users.filter(u => !u.id.startsWith("__"));

  return (
    <div style={styles.adminWrap}>
      <h2 style={styles.sectionTitle}>Admin Panel</h2>
      <div style={styles.tabRow}>
        {["assign","block","users"].map(t => (
          <button key={t} style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }} onClick={() => setTab(t)}>
            {t === "assign" ? "Assign Days" : t === "block" ? "Block Days" : "Users"}
          </button>
        ))}
      </div>

      {tab === "assign" && (
        <div style={styles.adminSection}>
          <p style={styles.modalText}>Assign a day to a household member and optionally require towels.</p>
          <label style={styles.label}>Select Date</label>
          <select style={styles.input} value={selDate} onChange={e => setSelDate(e.target.value)}>
            <option value="">— pick a date —</option>
            {allDates.map(d => {
              const key = dateKey(d);
              const entry = schedule[key] || {};
              return (
                <option key={key} value={key}>
                  {DAY_FULL[d.getDay()]} {d.getMonth()+1}/{d.getDate()} {entry.assignedTo ? `(${entry.assignedTo})` : "(open)"}
                </option>
              );
            })}
          </select>
          <label style={styles.label}>Assign To</label>
          <select style={styles.input} value={assignTo} onChange={e => setAssignTo(e.target.value)}>
            <option value="">— clear / unassign —</option>
            {registeredUsers.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.id})</option>
            ))}
            <option value="__malakai__">Malakai (household)</option>
            <option value="__scott_starla__">Scott + Starla (household)</option>
            <option value="__alyssa_josiah__">Alyssa + Josiah (household)</option>
          </select>
          <label style={styles.checkRow}>
            <input type="checkbox" checked={towels} onChange={e => setTowels(e.target.checked)} />
            <span>Towels required on this day</span>
          </label>
          <button style={styles.primaryBtn} onClick={handleAssign}>Save Assignment</button>

          <h3 style={{ ...styles.sectionTitle, fontSize: 16, marginTop: 28 }}>Quick Towels Toggle</h3>
          <div style={styles.towelGrid}>
            {allDates.map(d => {
              const key = dateKey(d);
              const entry = schedule[key] || {};
              if (!entry.assignedTo) return null;
              return (
                <button
                  key={key}
                  style={{ ...styles.towelBtn, ...(entry.towels ? styles.towelBtnOn : {}) }}
                  onClick={() => toggleTowels(key)}
                >
                  {DAY_FULL[d.getDay()].slice(0,3)} {d.getMonth()+1}/{d.getDate()}
                  <br /><span style={{ fontSize: 11, opacity: 0.75 }}>{entry.assignedTo}</span>
                  <br /><span style={{ fontSize: 11, fontWeight: 600 }}>{entry.towels ? "Towels ON" : "Towels OFF"}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === "block" && (
        <div style={styles.adminSection}>
          <p style={styles.modalText}>Toggle to block or unblock days. Blocked days cannot be requested by users.</p>
          <div style={styles.blockGrid}>
            {allDates.map(d => {
              const key = dateKey(d);
              const entry = schedule[key] || {};
              return (
                <button
                  key={key}
                  style={{ ...styles.blockBtn, ...(entry.blocked ? styles.blockBtnOn : {}) }}
                  onClick={() => toggleBlock(key)}
                >
                  {entry.blocked ? "Blocked" : "Open"}<br />{DAY_FULL[d.getDay()].slice(0,3)}<br />{d.getMonth()+1}/{d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === "users" && (
        <div style={styles.adminSection}>
          <h3 style={{ ...styles.sectionTitle, fontSize: 16 }}>Registered Users</h3>
          {registeredUsers.map(u => (
            <div key={u.id} style={styles.userRow}>
              <span>{u.firstName} {u.lastName}</span>
              <span style={styles.userIdBadge}>{u.id}</span>
              {u.isAdmin && <span style={styles.adminBadge}>Admin</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ title, children, onClose }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>{title}</span>
          <button style={styles.closeBtn} onClick={onClose}>x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const F = "'Calibri', 'Gill Sans', 'Trebuchet MS', 'Segoe UI', sans-serif";

const styles = {
  appWrap: {
    minHeight: "100vh",
    background: "#0f0f14",
    color: "#f0f0f5",
    fontFamily: F,
    paddingBottom: 40,
  },
  header: {
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
    borderBottom: "3px solid #22c5e0",
    padding: "14px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    boxShadow: "0 4px 20px rgba(34,197,224,0.15)",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  headerLogoMark: {
    width: 40, height: 40, borderRadius: 10,
    background: "linear-gradient(135deg, #22c5e0, #a855f7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: F, fontWeight: 700, fontSize: 14, color: "#fff", letterSpacing: 1,
    flexShrink: 0,
  },
  headerTitle: { fontFamily: F, fontWeight: 700, fontSize: 17, color: "#e2e8f0", letterSpacing: 0.2 },
  headerSub: { fontSize: 12, color: "#64748b", fontFamily: F },
  headerNav: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  navBtn: {
    background: "transparent", border: "1.5px solid #2d3748", color: "#94a3b8",
    borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontFamily: F,
    transition: "all 0.2s",
  },
  navBtnActive: { background: "#22c5e018", borderColor: "#22c5e0", color: "#22c5e0" },
  logoutBtn: {
    background: "transparent", border: "1.5px solid #ef444440", color: "#ef4444",
    borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontFamily: F,
  },
  badge: {
    background: "#ef4444", color: "#fff", borderRadius: "50%",
    padding: "1px 6px", fontSize: 11, marginLeft: 4, fontFamily: F,
  },
  // Auth
  authBg: {
    minHeight: "100vh", background: "#0f0f14",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: F,
  },
  authCard: {
    background: "linear-gradient(160deg, #1a1a2e, #16213e)",
    border: "1.5px solid #1e293b", borderRadius: 18,
    padding: "36px 32px", width: "100%", maxWidth: 380,
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },
  authLogo: { display: "flex", alignItems: "center", gap: 14, marginBottom: 28 },
  authLogoMark: {
    width: 52, height: 52, borderRadius: 14,
    background: "linear-gradient(135deg, #22c5e0, #a855f7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 18, color: "#fff", letterSpacing: 1, fontFamily: F,
    flexShrink: 0,
  },
  authTitle: { fontFamily: F, fontWeight: 700, fontSize: 20, color: "#e2e8f0" },
  authSubtitle: { fontSize: 13, color: "#64748b", fontFamily: F },
  tabRow: { display: "flex", gap: 6, marginBottom: 20 },
  tab: {
    flex: 1, background: "transparent", border: "1.5px solid #1e293b",
    color: "#64748b", borderRadius: 7, padding: "8px", cursor: "pointer",
    fontFamily: F, fontSize: 13,
  },
  tabActive: { background: "#22c5e018", borderColor: "#22c5e0", color: "#22c5e0" },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  label: { fontSize: 12, color: "#94a3b8", fontFamily: F, marginBottom: -4, fontWeight: 600, letterSpacing: 0.3 },
  input: {
    background: "#0c0c12", border: "1.5px solid #1e293b", borderRadius: 7,
    color: "#f0f0f5", padding: "10px 12px", fontSize: 14, fontFamily: F,
    outline: "none",
  },
  usernamePreview: {
    background: "#22c5e010", border: "1px solid #22c5e030",
    borderRadius: 6, padding: "8px 12px", fontSize: 13, color: "#22c5e0", fontFamily: F,
  },
  authBtn: {
    background: "linear-gradient(135deg, #22c5e0, #a855f7)",
    border: "none", borderRadius: 9, color: "#fff",
    padding: "12px", fontSize: 15, fontFamily: F, fontWeight: 700,
    cursor: "pointer", marginTop: 8, letterSpacing: 0.3,
  },
  // Calendar
  calWrap: { padding: "24px 20px" },
  calGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 20, maxWidth: 1100, margin: "0 auto",
  },
  weekCard: {
    background: "#1a1a2e", borderRadius: 14,
    overflow: "hidden", boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
    border: "1px solid #1e293b",
  },
  weekHeader: {
    background: "#16213e", padding: "11px 16px",
    fontFamily: F, fontWeight: 700, fontSize: 15, color: "#e2e8f0",
    borderBottom: "2px solid #22c5e030", textAlign: "center", letterSpacing: 0.3,
  },
  dayRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 14px", borderBottom: "1px solid rgba(0,0,0,0.12)",
    transition: "filter 0.15s", position: "relative",
  },
  dayLetter: {
    width: 26, height: 26, borderRadius: "50%",
    background: "rgba(0,0,0,0.22)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: F, fontWeight: 700,
    fontSize: 13, color: "#fff", flexShrink: 0, textAlign: "center",
  },
  dayDateNum: { fontSize: 12, color: "rgba(255,255,255,0.65)", flexShrink: 0, width: 18, fontFamily: F },
  dayName: {
    flex: 1, fontFamily: F, fontWeight: 600, fontSize: 13,
    color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.3)",
    textTransform: "uppercase", letterSpacing: 0.4,
    display: "flex", alignItems: "center", gap: 6,
  },
  dayNameInner: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  towelBadge: {
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.35)",
    color: "#fff",
    borderRadius: 4,
    padding: "1px 6px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  myDayDot: {
    width: 7, height: 7, borderRadius: "50%",
    background: "#fff", boxShadow: "0 0 5px rgba(255,255,255,0.8)", flexShrink: 0,
  },
  legend: {
    display: "flex", gap: 20, flexWrap: "wrap",
    maxWidth: 1100, margin: "14px auto 0",
    color: "#64748b", fontSize: 12, padding: "0 4px",
    fontFamily: F, alignItems: "center",
  },
  legendDot: { display: "inline-block", width: 9, height: 9, borderRadius: "50%", marginRight: 5 },
  towelBadgeLegend: {
    background: "rgba(100,116,139,0.3)",
    border: "1px solid rgba(100,116,139,0.5)",
    color: "#94a3b8",
    borderRadius: 4, padding: "1px 6px", fontSize: 10,
    fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", marginRight: 4,
  },
  // Requests
  reqWrap: { padding: "24px 20px", maxWidth: 700, margin: "0 auto" },
  sectionTitle: { fontFamily: F, fontWeight: 700, fontSize: 20, color: "#e2e8f0", marginBottom: 16 },
  emptyMsg: { color: "#64748b", fontStyle: "italic", fontFamily: F, fontSize: 14 },
  reqCard: {
    background: "#1a1a2e", border: "1px solid #1e293b",
    borderRadius: 12, padding: "16px 18px", marginBottom: 12,
  },
  reqCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  reqUser: { fontFamily: F, fontWeight: 700, fontSize: 15, color: "#e2e8f0" },
  reqStatus: { borderRadius: 20, padding: "3px 12px", fontSize: 11, fontFamily: F, fontWeight: 700, color: "#fff", letterSpacing: 0.4, textTransform: "uppercase" },
  reqDays: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 },
  reqDayChip: {
    background: "#22c5e012", border: "1px solid #22c5e030",
    borderRadius: 5, padding: "3px 9px", fontSize: 12, color: "#22c5e0", fontFamily: F,
  },
  reqMsg: { color: "#94a3b8", fontSize: 13, fontStyle: "italic", margin: "4px 0 0", fontFamily: F },
  // Admin
  adminWrap: { padding: "24px 20px", maxWidth: 800, margin: "0 auto" },
  adminSection: { marginTop: 20 },
  checkRow: { display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 14, cursor: "pointer", fontFamily: F, margin: "10px 0" },
  towelGrid: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 },
  towelBtn: {
    background: "#16213e", border: "1.5px solid #1e293b",
    borderRadius: 8, padding: "9px 13px", color: "#94a3b8",
    cursor: "pointer", fontSize: 13, fontFamily: F, textAlign: "center",
    lineHeight: 1.6,
  },
  towelBtnOn: { background: "#22c5e012", borderColor: "#22c5e0", color: "#22c5e0" },
  blockGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 8 },
  blockBtn: {
    background: "#16213e", border: "1.5px solid #1e293b",
    borderRadius: 8, padding: "10px 6px", color: "#94a3b8",
    cursor: "pointer", fontSize: 12, fontFamily: F, textAlign: "center",
    lineHeight: 1.7,
  },
  blockBtnOn: { background: "#ef444412", borderColor: "#ef4444", color: "#ef4444" },
  userRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", background: "#16213e",
    borderRadius: 9, marginBottom: 8, border: "1px solid #1e293b",
    fontFamily: F, fontSize: 14, color: "#e2e8f0",
  },
  userIdBadge: {
    background: "#22c5e012", color: "#22c5e0",
    borderRadius: 5, padding: "2px 10px", fontSize: 12, fontFamily: F, fontWeight: 600,
  },
  adminBadge: {
    background: "#a855f712", color: "#a855f7",
    borderRadius: 5, padding: "2px 10px", fontSize: 12, fontFamily: F, fontWeight: 600,
  },
  // Modal
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 100, padding: 20,
  },
  modalCard: {
    background: "#1a1a2e", borderRadius: 16,
    padding: "24px", width: "100%", maxWidth: 480,
    border: "1px solid #1e293b", boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
    maxHeight: "85vh", overflowY: "auto",
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontFamily: F, fontWeight: 700, fontSize: 17, color: "#e2e8f0" },
  closeBtn: { background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16, fontFamily: F },
  modalText: { color: "#94a3b8", fontSize: 14, marginBottom: 14, lineHeight: 1.6, fontFamily: F },
  modalDayGrid: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  dayPickBtn: {
    background: "#0c0c12", border: "1.5px solid #1e293b",
    borderRadius: 7, padding: "8px 12px", color: "#94a3b8",
    cursor: "pointer", fontSize: 13, fontFamily: F,
  },
  dayPickBtnSel: { background: "#22c5e012", borderColor: "#22c5e0", color: "#22c5e0" },
  textarea: {
    width: "100%", background: "#0c0c12", border: "1.5px solid #1e293b",
    borderRadius: 7, color: "#f0f0f5", padding: "10px 12px",
    fontSize: 14, fontFamily: F, resize: "vertical", marginBottom: 14,
    boxSizing: "border-box",
  },
  primaryBtn: {
    background: "linear-gradient(135deg, #22c5e0, #a855f7)",
    border: "none", borderRadius: 7, color: "#fff",
    padding: "10px 20px", fontSize: 14, fontFamily: F, fontWeight: 700,
    cursor: "pointer", letterSpacing: 0.2,
  },
  secondaryBtn: {
    background: "#1e293b", border: "none", borderRadius: 7, color: "#94a3b8",
    padding: "10px 20px", fontSize: 14, fontFamily: F, cursor: "pointer",
  },
  dangerBtn: {
    background: "#ef444412", border: "1.5px solid #ef4444", borderRadius: 7, color: "#ef4444",
    padding: "10px 20px", fontSize: 14, fontFamily: F, cursor: "pointer",
  },
  toast: {
    position: "fixed", bottom: 24, right: 24,
    borderRadius: 9, padding: "12px 20px",
    color: "#fff", fontFamily: F, fontWeight: 600, fontSize: 14,
    boxShadow: "0 8px 30px rgba(0,0,0,0.4)", zIndex: 200,
  },
};