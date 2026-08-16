/* ============================================================
   MEMORY SECTION SELECT
   ============================================================ */

function populateMemorySectionSelect() {
  const select = document.getElementById("memorySection");
  if (!select) return;

  select.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "all memories ♡";
  select.appendChild(allOption);

  sections.forEach(section => {
    const option = document.createElement("option");
    option.value = section.id;
    option.textContent = section.title;
    select.appendChild(option);
  });
}


/* ============================================================
   RESET MEMORY FORM
   ============================================================ */

function resetMemoryForm() {
  const form = document.getElementById("memoryForm");
  if (form) form.reset();

  const error = document.getElementById("memoryError");
  if (error) error.textContent = "";

  const progress = document.getElementById("uploadProgress");
  if (progress) progress.classList.add("hidden");

  const file = document.getElementById("memoryFile");
  if (file) file.value = "";
}


/* ============================================================
   HELPERS
   ============================================================ */

function getFileExtension(filename) {
  const parts = filename.split(".");
  return parts.length < 2
    ? "file"
    : parts.pop().toLowerCase().replace(/[^a-z0-9]/g, "");
}

let toastTimeout;

function showToast(message) {
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add("show");

  toastTimeout = setTimeout(
    () => toast.classList.remove("show"),
    3000
  );
}


/* ============================================================
   DYNAMIC STYLES
   ============================================================ */

(function () {
  const style = document.createElement("style");

  style.textContent = `
    .section-nav-item{display:flex;align-items:center;gap:4px}
    .section-nav-item .nav-item{flex:1}
    .section-drag-handle{cursor:grab;user-select:none;opacity:.55;padding:4px;font-size:16px;line-height:1}
    .section-drag-handle:active{cursor:grabbing}
    .section-nav-item.dragging{opacity:.45}
    .section-nav-item.drag-over{transform:translateY(-2px)}
    .remove-section,.edit-memory,.delete-memory{border:0;background:transparent;cursor:pointer}
    .edit-memory{margin-right:8px}
    .memory-admin{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
    .media-error{opacity:.4}
    #editMemoryModal .modal-card{max-height:90vh;overflow-y:auto}
    #editMemoryModal textarea{resize:vertical}

    .live-presence{display:flex;flex-direction:column;gap:6px;margin-top:8px;font-size:13px;opacity:.72;letter-spacing:.1px}
    .presence-summary{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
    .presence-main{display:flex;align-items:center;gap:6px}
    .presence-heart{display:inline-block;animation:presenceHeartPulse 1.5s ease-in-out infinite;transform-origin:center;font-size:15px}
    .visitor-count{opacity:.7}
    .visitor-list{display:flex;flex-direction:column;gap:8px;margin-top:6px}
    .visitor-card{padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.5);font-size:12px;line-height:1.5}
    .visitor-title{display:flex;justify-content:space-between;gap:12px}
    .visitor-title span{opacity:.65}
    .visitor-current{margin-top:3px}
    .visitor-sections{margin-top:5px}
    .visitor-label{opacity:.6;display:block;margin-bottom:3px}
    .visitor-section-tags{display:flex;gap:4px;flex-wrap:wrap}
    .visitor-tag{padding:2px 7px;border-radius:999px;background:rgba(255,255,255,.7)}
    .visitor-muted{opacity:.55}
    .visitor-total{margin-top:6px}

    @keyframes presenceHeartPulse{
      0%,100%{transform:scale(1);opacity:.7}
      50%{transform:scale(1.25);opacity:1}
    }
  `;

  document.head.appendChild(style);
})();


/* ============================================================
   VISITOR HISTORY
   ============================================================ */

let currentVisitId =
  localStorage.getItem("gallery_current_visit_id");

let currentVisitStartedAt =
  localStorage.getItem("gallery_current_visit_started_at");

let historySectionsVisited = [];
let visitorHistoryInterval = null;


/* ============================================================
   START / RESUME VISIT
   ============================================================ */

async function startVisitorHistory() {
  try {
    const now = Date.now();

    const previousStart = currentVisitStartedAt
      ? new Date(currentVisitStartedAt).getTime()
      : 0;

    const newVisit =
      !currentVisitId ||
      !previousStart ||
      now - previousStart > 45000;

    if (newVisit) {
      currentVisitId = null;
      currentVisitStartedAt = new Date().toISOString();

      historySectionsVisited =
        currentSection ? [currentSection] : [];

      const { data, error } =
        await supabaseClient
          .from("gallery_visit_history")
          .insert({
            visitor_id: visitorId,
            started_at: currentVisitStartedAt,
            duration_seconds: 0,
            sections_visited: historySectionsVisited,
            last_section_id: currentSection
          })
          .select("id")
          .single();

      if (error) {
        console.error("Visitor history start failed:", error);
        return;
      }

      currentVisitId = data.id;

      localStorage.setItem(
        "gallery_current_visit_id",
        currentVisitId
      );

      localStorage.setItem(
        "gallery_current_visit_started_at",
        currentVisitStartedAt
      );
    }

    if (
      currentSection &&
      !historySectionsVisited.includes(currentSection)
    ) {
      historySectionsVisited.push(currentSection);
    }

    updateVisitorHistory();
  } catch (error) {
    console.error("startVisitorHistory:", error);
  }
}


/* ============================================================
   UPDATE VISIT
   ============================================================ */

async function updateVisitorHistory() {
  if (!currentVisitId || !currentVisitStartedAt) return;

  try {
    if (
      currentSection &&
      !historySectionsVisited.includes(currentSection)
    ) {
      historySectionsVisited.push(currentSection);
    }

    const started =
      new Date(currentVisitStartedAt).getTime();

    const duration = Math.max(
      0,
      Math.floor((Date.now() - started) / 1000)
    );

    const { error } =
      await supabaseClient.rpc(
        "update_gallery_visit",
        {
          p_id: currentVisitId,
          p_duration_seconds: duration,
          p_ended_at: new Date().toISOString(),
          p_sections_visited: historySectionsVisited,
          p_last_section_id: currentSection
        }
      );

    if (error)
      console.error("Visitor history update failed:", error);
  } catch (error) {
    console.error("updateVisitorHistory:", error);
  }
}


function recordHistorySection() {
  if (
    currentSection &&
    !historySectionsVisited.includes(currentSection)
  ) {
    historySectionsVisited.push(currentSection);
  }

  updateVisitorHistory();
}


async function endVisitorHistory() {
  await updateVisitorHistory();
}


/* ============================================================
   VISIBILITY
   ============================================================ */

document.addEventListener(
  "visibilitychange",
  async () => {
    if (document.visibilityState === "hidden") {
      await endVisitorHistory();
      return;
    }

    if (document.visibilityState === "visible") {
      const lastStart = currentVisitStartedAt
        ? new Date(currentVisitStartedAt).getTime()
        : 0;

      if (!lastStart || Date.now() - lastStart > 45000) {
        currentVisitId = null;
        currentVisitStartedAt = null;
        historySectionsVisited = [];

        localStorage.removeItem("gallery_current_visit_id");
        localStorage.removeItem("gallery_current_visit_started_at");

        await startVisitorHistory();
      } else {
        await updateVisitorHistory();
      }
    }
  }
);


window.addEventListener("beforeunload", () => {
  updateVisitorHistory();
});


function startVisitorHistoryUpdates() {
  if (visitorHistoryInterval) return;

  visitorHistoryInterval = setInterval(
    updateVisitorHistory,
    15000
  );
}


/* ============================================================
   ADMIN HISTORY BUTTON
   ============================================================ */

function createVisitorHistoryButton() {
  if (!isAdmin) return;
  if (document.getElementById("visitorHistoryButton")) return;

  const display = document.getElementById("livePresence");
  if (!display) return;

  const button = document.createElement("button");

  button.id = "visitorHistoryButton";
  button.type = "button";
  button.textContent = "📖 visitor history";
  button.addEventListener("click", openVisitorHistory);

  display.appendChild(button);
}


/* ============================================================
   HISTORY MODAL
   ============================================================ */

async function openVisitorHistory() {
  if (!isAdmin) return;

  let modal = document.getElementById("visitorHistoryModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "visitorHistoryModal";
    modal.className = "visitor-history-modal";

    modal.innerHTML = `
      <div class="visitor-history-backdrop"></div>

      <div class="visitor-history-card">
        <button class="visitor-history-close" type="button">×</button>

        <div class="visitor-history-heading">
          <span>📖</span>
          <div>
            <h2>visitor history</h2>
            <p>little footprints left behind ♡</p>
          </div>
        </div>

        <div id="visitorHistoryContent"
             class="visitor-history-content">
          <div class="visitor-history-loading">
            loading history...
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal
      .querySelector(".visitor-history-close")
      .addEventListener("click", closeVisitorHistory);

    modal
      .querySelector(".visitor-history-backdrop")
      .addEventListener("click", closeVisitorHistory);
  }

  modal.classList.add("show");
  await loadVisitorHistory();
}


function closeVisitorHistory() {
  const modal = document.getElementById("visitorHistoryModal");
  if (modal) modal.classList.remove("show");
}


/* ============================================================
   LOAD + GROUP HISTORY
   ============================================================ */

async function loadVisitorHistory() {
  const content =
    document.getElementById("visitorHistoryContent");

  if (!content) return;

  content.innerHTML = `
    <div class="visitor-history-loading">
      loading history...
    </div>
  `;

  try {
    const myVisitorId =
      localStorage.getItem("gallery_visitor_id");

    const { data, error } =
      await supabaseClient
        .from("gallery_visit_history")
        .select("*")
        .order("started_at", { ascending: false });

    if (error) {
      console.error("loadVisitorHistory:", error);

      content.innerHTML = `
        <div class="visitor-history-error">
          couldn't load visitor history ♡
        </div>
      `;

      return;
    }

    const visits = (data || []).filter(
      visit => visit.visitor_id !== myVisitorId
    );

    if (!visits.length) {
      content.innerHTML = `
        <div class="visitor-history-empty">
          <div>♡</div>
          <p>no other visits recorded yet</p>
        </div>
      `;
      return;
    }

    const grouped = new Map();

    visits.forEach(visit => {
      if (!grouped.has(visit.visitor_id))
        grouped.set(visit.visitor_id, []);

      grouped.get(visit.visitor_id).push(visit);
    });

    content.innerHTML = "";

    let visitorNumber = 1;

    grouped.forEach((visitorVisits, visitorId) => {
      visitorVisits.sort(
        (a, b) =>
          new Date(b.started_at) -
          new Date(a.started_at)
      );

      const card = document.createElement("div");
      card.className = "visitor-group";

      const visitsHtml = visitorVisits
        .map((visit, i) => {
          const started = new Date(visit.started_at);

          const dateText =
            started.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric"
            });

          const timeText =
            started.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit"
            });

          const duration =
            formatDuration(visit.duration_seconds || 0);

          const names =
            (visit.sections_visited || [])
              .map(id => getSectionName(id))
              .filter(Boolean);

          const sectionsHtml = names.length
            ? names
                .map(
                  name =>
                    `<span class="history-section-tag">${escapeHtml(name)}</span>`
                )
                .join("")
            : `<span class="history-section-tag">all memories ♡</span>`;

          return `
            <div class="grouped-visit">
              <div class="grouped-visit-top">
                <strong>Visit ${visitorVisits.length - i}</strong>
                <span>${escapeHtml(dateText)} · ${escapeHtml(timeText)}</span>
              </div>

              <div class="history-entry-duration">
                ⏱️ <strong>${escapeHtml(duration)}</strong>
              </div>

              <div class="history-entry-sections">
                <span class="history-label">sections visited</span>
                <div class="history-section-tags">
                  ${sectionsHtml}
                </div>
              </div>
            </div>
          `;
        })
        .join("");

      card.innerHTML = `
        <div class="visitor-group-header">
          <div>
            <strong>Visitor ${visitorNumber}</strong>
            <span class="visitor-group-count">
              ${visitorVisits.length}
              ${visitorVisits.length === 1 ? "visit" : "visits"}
            </span>
          </div>

          <div class="visitor-group-id">
            ${escapeHtml(visitorId)}
          </div>
        </div>

        <div class="grouped-visits">
          ${visitsHtml}
        </div>
      `;

      content.appendChild(card);
      visitorNumber++;
    });
  } catch (error) {
    console.error("Grouped visitor history failed:", error);

    content.innerHTML = `
      <div class="visitor-history-error">
        couldn't load visitor history ♡
      </div>
    `;
  }
}


/* ============================================================
   HISTORY STYLES
   ============================================================ */

(function () {
  const style = document.createElement("style");

  style.textContent = `
    #visitorHistoryButton{
      border:0;background:transparent;cursor:pointer;
      font:inherit;font-size:12px;opacity:.7;
      padding:3px 0;text-decoration:underline;
      text-underline-offset:3px
    }

    #visitorHistoryButton:hover{opacity:1}

    .visitor-history-modal{
      position:fixed;inset:0;z-index:9999;
      display:none;align-items:center;justify-content:center;
      padding:20px
    }

    .visitor-history-modal.show{display:flex}

    .visitor-history-backdrop{
      position:absolute;inset:0;
      background:rgba(0,0,0,.25);
      backdrop-filter:blur(4px)
    }

    .visitor-history-card{
      position:relative;z-index:1;
      width:min(700px,100%);max-height:85vh;
      overflow-y:auto;background:#fff;
      border-radius:18px;padding:24px;
      box-shadow:0 20px 60px rgba(0,0,0,.18)
    }

    .visitor-history-close{
      position:absolute;right:15px;top:12px;
      border:0;background:transparent;
      font-size:25px;cursor:pointer;opacity:.6
    }

    .visitor-history-heading{
      display:flex;align-items:center;
      gap:12px;margin-bottom:20px
    }

    .visitor-history-heading>span{font-size:25px}
    .visitor-history-heading h2{margin:0}
    .visitor-history-heading p{
      margin:3px 0 0;opacity:.6;font-size:13px
    }

    .visitor-history-content{
      display:flex;flex-direction:column;gap:10px
    }

    .visitor-history-entry,.visitor-group{
      border:1px solid rgba(0,0,0,.06);
      border-radius:14px;overflow:hidden;
      background:rgba(255,255,255,.7)
    }

    .visitor-history-entry{
      padding:13px 15px
    }

    .history-entry-top,.grouped-visit-top{
      display:flex;justify-content:space-between;
      gap:12px;flex-wrap:wrap
    }

    .history-entry-top span,
    .grouped-visit-top span{
      opacity:.6;font-size:12px
    }

    .history-entry-duration{
      margin-top:6px;font-size:13px
    }

    .history-entry-sections{margin-top:7px}
    .history-label{
      display:block;opacity:.55;
      font-size:11px;margin-bottom:4px
    }

    .history-section-tags{
      display:flex;gap:5px;flex-wrap:wrap
    }

    .history-section-tag{
      padding:3px 8px;border-radius:999px;
      background:rgba(255,255,255,.9);font-size:11px
    }

    .history-entry-id{
      margin-top:8px;opacity:.35;
      font-size:9px;word-break:break-all
    }

    .visitor-history-loading,
    .visitor-history-empty,
    .visitor-history-error{
      text-align:center;padding:30px 15px;opacity:.65
    }

    .visitor-history-empty>div{
      font-size:30px;margin-bottom:5px
    }

    .visitor-group-header{
      padding:13px 15px;
      background:rgba(255,255,255,.85);
      border-bottom:1px solid rgba(0,0,0,.06)
    }

    .visitor-group-header>div:first-child{
      display:flex;align-items:center;gap:8px
    }

    .visitor-group-count{
      font-size:11px;opacity:.5
    }

    .visitor-group-id{
      margin-top:4px;font-size:9px;
      opacity:.35;word-break:break-all
    }

    .grouped-visits{
      display:flex;flex-direction:column
    }

    .grouped-visit{
      padding:12px 15px;
      border-bottom:1px solid rgba(0,0,0,.05)
    }

    .grouped-visit:last-child{border-bottom:0}

    .live-presence{
      font-size:16px!important;
      line-height:1.5
    }

    .presence-main{
      font-size:18px!important;
      font-weight:500
    }

    .presence-heart{font-size:19px!important}

    #visitorHistoryButton{
      position:fixed!important;
      top:18px!important;
      right:20px!important;
      z-index:10000!important;
      padding:7px 11px!important;
      border-radius:10px!important;
      background:rgba(255,255,255,.85)!important;
      backdrop-filter:blur(8px);
      box-shadow:0 3px 12px rgba(0,0,0,.08);
      font-size:12px!important
    }
  `;

  document.head.appendChild(style);
})();


/* ============================================================
   START HISTORY
   ============================================================ */

setTimeout(async () => {
  await startVisitorHistory();
  startVisitorHistoryUpdates();
}, 500);


/* ============================================================
   WATCH ADMIN PRESENCE PANEL
   ============================================================ */

const visitorHistoryObserver =
  new MutationObserver(() => {
    if (isAdmin) createVisitorHistoryButton();
  });

visitorHistoryObserver.observe(document.body, {
  childList: true,
  subtree: true
});

setTimeout(() => {
  if (isAdmin) createVisitorHistoryButton();
}, 1000);


/* ============================================================
   ♡ LYSS ONLINE / LAST ACTIVE
   ============================================================ */

(function () {

  const LYSS_PRESENCE_ID = "lyss";
  const ONLINE_TIMEOUT = 90000;

  function formatLastActive(date) {
    const seconds =
      Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
      return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24)
      return `${hours} hour${hours === 1 ? "" : "s"} ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }


  async function sendLyssHeartbeat() {
    if (typeof isAdmin === "undefined" || !isAdmin) return;

    try {
      const { error } =
        await supabaseClient
          .from("admin_presence")
          .upsert(
            {
              id: LYSS_PRESENCE_ID,
              last_seen: new Date().toISOString()
            },
            { onConflict: "id" }
          );

      if (error)
        console.error("Lyss heartbeat error:", error);

    } catch (error) {
      console.error("Lyss heartbeat failed:", error);
    }
  }


  async function updateLyssStatusDisplay() {
    try {
      const { data, error } =
        await supabaseClient
          .from("admin_presence")
          .select("last_seen")
          .eq("id", LYSS_PRESENCE_ID)
          .maybeSingle();

      if (error) {
        console.error("Lyss presence error:", error);
        return;
      }

      let el =
        document.getElementById("lyss-online-status");

      if (!el) {
        el = document.createElement("div");
        el.id = "lyss-online-status";

        el.style.cssText =
          "font-size:13px;margin-top:4px;opacity:.8;";

        document.body.appendChild(el);
      }

      if (!data?.last_seen) {
        el.textContent = "⚪ lyss is offline";
        return;
      }

      const lastSeen = new Date(data.last_seen);

      const online =
        Date.now() - lastSeen.getTime() <= ONLINE_TIMEOUT;

      el.textContent = online
        ? "♡ lyss is online"
        : `♡ lyss was last active ${formatLastActive(lastSeen)}`;

    } catch (error) {
      console.error("Could not update Lyss status:", error);
    }
  }


  async function startLyssPresence() {
    if (typeof isAdmin !== "undefined" && isAdmin)
      await sendLyssHeartbeat();

    await updateLyssStatusDisplay();
  }


  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      startLyssPresence
    );
  } else {
    startLyssPresence();
  }


  setInterval(async () => {
    if (typeof isAdmin !== "undefined" && isAdmin)
      await sendLyssHeartbeat();

    await updateLyssStatusDisplay();
  }, 30000);

})();
