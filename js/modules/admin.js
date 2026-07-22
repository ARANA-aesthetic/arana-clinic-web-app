/**
 * ARANA CLINIC — Admin Module
 * js/modules/admin.js
 */

let adminTab = 'ai';

function renderAdmin(container) {
  adminTab = 'ai';
  container.innerHTML = `
  <div>
    <div class="tab-bar">
      <button class="tab-btn active" id="adm-tab-ai" onclick="admSwitch('ai')">
        <i data-lucide="cpu"></i>AI Auto-Verification
      </button>
      <button class="tab-btn" id="adm-tab-users" onclick="admSwitch('users')">
        <i data-lucide="users"></i>จัดการผู้ใช้
      </button>
      <button class="tab-btn" id="adm-tab-logs" onclick="admSwitch('logs')">
        <i data-lucide="activity"></i>System Logs
      </button>
    </div>
    <div id="adm-body"></div>
  </div>`;
  admRender();
  lucide.createIcons();
}

function renderSystemLogs(container) {
  adminTab = 'logs';
  renderAdmin(container);
}

function admSwitch(tab) {
  adminTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById(`adm-tab-${tab}`);
  if (el) el.classList.add('active');
  admRender();
}

function admRender() {
  const body = document.getElementById('adm-body');
  if (!body) return;
  if (adminTab === 'ai') admRenderAI(body);
  else if (adminTab === 'users') admRenderUsers(body);
  else admRenderLogs(body);
}

// ── AI Auto-Verification ──────────────────────────────────
function admRenderAI(body) {
  const pendingBills = DB.getBills().filter(b => b.status === 'รอตรวจสอบ');
  const pendingStock = DB.getStockLogs({ auditStatus: 'รอตรวจสอบ' });

  body.innerHTML = `
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px;">
    <div class="stat-card">
      <div class="stat-icon burgundy"><i data-lucide="file-clock"></i></div>
      <div class="stat-body">
        <div class="stat-label">บิล OPD รอตรวจ</div>
        <div class="stat-value">${pendingBills.length}</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon orange"><i data-lucide="package"></i></div>
      <div class="stat-body">
        <div class="stat-label">สต๊อกรอตรวจ</div>
        <div class="stat-value">${pendingStock.length}</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green"><i data-lucide="check-circle"></i></div>
      <div class="stat-body">
        <div class="stat-label">ผ่านการตรวจล่าสุด</div>
        <div class="stat-value">${DB.getBills().filter(b=>b.status==='อนุมัติแล้ว').length}</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon blue"><i data-lucide="cpu"></i></div>
      <div class="stat-body">
        <div class="stat-label">AI Model</div>
        <div class="stat-value" style="font-size:0.9rem;">ARANA-v1</div>
        <div class="stat-sub">Rule-based Engine</div>
      </div>
    </div>
  </div>

  <div class="glass-card" style="text-align:center;padding:32px;">
    <div style="font-size:2rem;margin-bottom:8px;">🤖</div>
    <h3 style="font-size:1.1rem;font-weight:700;color:var(--burgundy-800);margin-bottom:8px;">AI Auto-Verification Engine</h3>
    <p style="font-size:0.85rem;color:var(--gray-500);margin-bottom:20px;max-width:440px;margin-left:auto;margin-right:auto;">ตรวจสอบอัตโนมัติ: ภาพ OPD ครบ, รายการเบิกตรงกับบิล, ค่าคอมอยู่ในเกณฑ์ปกติ</p>
    <button class="btn btn-primary" id="ai-run-btn" onclick="admRunAI()">
      <i data-lucide="play"></i> เริ่มการตรวจสอบ
    </button>
  </div>
  <div id="ai-results" style="margin-top:16px;"></div>`;
  lucide.createIcons();
}

function admRunAI() {
  const btn = document.getElementById('ai-run-btn');
  const results = document.getElementById('ai-results');
  btn.classList.add('loading'); btn.disabled = true;
  results.innerHTML = `<div class="loading-placeholder" style="height:150px;"><div class="spinner"></div><p style="margin-top:8px;">AI กำลังประมวลผล...</p></div>`;
  lucide.createIcons();

  setTimeout(() => {
    btn.classList.remove('loading'); btn.disabled = false;
    const bills = DB.getBills().filter(b => b.status === 'รอตรวจสอบ');

    const analyzed = bills.map(b => {
      const services = DB.getBillServices(b.id);
      const supplies = DB.getBillSupplies(b.id);
      const images = DB.getBillImages ? DB.getBillImages(b.id) : [];
      const flags = [];
      if (!images.length) flags.push({ text: 'ไม่มีภาพ OPD', sev: 'high' });
      const hasCommission = services.some(s => s.commission > 0);
      if (hasCommission && !supplies.length) flags.push({ text: 'มีค่ามือแต่ไม่มีรายการเบิก', sev: 'high' });
      if (services.some(s => s.commission > s.price)) flags.push({ text: 'ค่ามือสูงกว่าราคาบริการ', sev: 'medium' });
      return { bill: b, flags, pass: flags.filter(f=>f.sev==='high').length === 0 };
    });

    const passed = analyzed.filter(a => a.pass).length;
    const failed = analyzed.filter(a => !a.pass).length;

    results.innerHTML = `
    <div class="alert-box ${failed===0?'alert-success':'alert-warning'}" style="margin-bottom:16px;">
      <i data-lucide="${failed===0?'check-circle':'alert-triangle'}"></i>
      <span>ตรวจสอบ ${analyzed.length} บิล — ผ่าน ${passed} | ไม่ผ่าน ${failed}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${analyzed.map(a => `
      <div class="ai-result-row ${a.pass?'pass':'fail'}">
        <i data-lucide="${a.pass?'check-circle':'x-circle'}" class="ai-result-icon"></i>
        <div style="flex:1;min-width:0;">
          <div class="ai-result-name">${a.bill.hn||''} — ${a.bill.customerName} <span style="font-size:0.75rem;color:var(--gray-500);">${formatDate(a.bill.date)}</span></div>
          ${a.flags.length ? `<div class="ai-result-flags" style="margin-top:4px;">
            ${a.flags.map(f => `<span class="badge ${f.sev==='high'?'badge-rejected':'badge-waiting'}">${f.text}</span>`).join('')}
          </div>` : '<div style="font-size:0.78rem;color:var(--green-600);">✓ ผ่านทุกเกณฑ์</div>'}
        </div>
        ${!a.pass ? `<button class="btn btn-danger btn-sm" onclick="audQuickAction('${a.bill.id}','ตีกลับ','AI: ไม่ผ่านการตรวจสอบอัตโนมัติ')">ตีกลับ</button>` : ''}
      </div>`).join('')}
    </div>`;
    lucide.createIcons();
  }, 3000);
}

// ── Users Management ──────────────────────────────────────
function admRenderUsers(body) {
  const users = DB.getUsers();
  body.innerHTML = `
  <div class="glass-card" style="margin-bottom:16px;">
    <div class="section-header" style="margin-bottom:14px;"><span class="section-title">เพิ่มผู้ใช้ใหม่</span></div>
    <div class="form-row-3" style="gap:10px;margin-bottom:10px;">
      <div class="form-group">
        <label class="form-label">ชื่อ-สกุล <span class="required">*</span></label>
        <input id="nu-name" class="form-input" placeholder="ชื่อ นามสกุล" />
      </div>
      <div class="form-group">
        <label class="form-label">ชื่อเล่น</label>
        <input id="nu-nick" class="form-input" placeholder="ชื่อเล่น" />
      </div>
      <div class="form-group">
        <label class="form-label">Username <span class="required">*</span></label>
        <input id="nu-user" class="form-input" placeholder="username" />
      </div>
    </div>
    <div class="form-row-3" style="gap:10px;margin-bottom:14px;">
      <div class="form-group">
        <label class="form-label">รหัสผ่าน <span class="required">*</span></label>
        <input id="nu-pass" type="password" class="form-input" placeholder="รหัสผ่าน" />
      </div>
      <div class="form-group">
        <label class="form-label">สิทธิ์</label>
        <select id="nu-role" class="form-select">
          <option value="Frontdesk">Frontdesk</option>
          <option value="Audit">Audit</option>
          <option value="Admin">Admin</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">สาขา</label>
        <select id="nu-branch" class="form-select">
          <option value="พิษณุโลก">พิษณุโลก</option>
          <option value="กำแพงเพชร">กำแพงเพชร</option>
          <option value="แม่สอด">แม่สอด</option>
        </select>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;">
      <button class="btn btn-primary" onclick="admAddUser()"><i data-lucide="user-plus"></i> เพิ่มผู้ใช้</button>
    </div>
  </div>

  <div class="glass-card" style="padding:0;overflow:hidden;">
    <div class="section-header" style="padding:14px 16px;border-bottom:1px solid var(--gray-100);margin:0;">
      <span class="section-title">รายชื่อผู้ใช้ทั้งหมด (${users.length} คน)</span>
    </div>
    <div class="table-wrap" style="border:none;border-radius:0;">
      <table>
        <thead><tr><th>ชื่อ</th><th>ชื่อเล่น</th><th>Username</th><th>สิทธิ์</th><th>สาขา</th></tr></thead>
        <tbody>
          ${users.map(u => `
          <tr>
            <td style="font-weight:600;">${u.name||'-'}</td>
            <td>${u.nickname||'-'}</td>
            <td><code style="font-size:0.8rem;background:var(--gray-100);padding:2px 8px;border-radius:4px;">${u.username||'-'}</code></td>
            <td><span class="user-role role-${(u.role||'frontdesk').toLowerCase()}">${u.role||'-'}</span></td>
            <td>${u.branch||'-'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
  lucide.createIcons();
}

function admAddUser() {
  const name = document.getElementById('nu-name')?.value.trim();
  const nick = document.getElementById('nu-nick')?.value.trim();
  const username = document.getElementById('nu-user')?.value.trim();
  const password = document.getElementById('nu-pass')?.value;
  const role = document.getElementById('nu-role')?.value || 'Frontdesk';
  const branch = document.getElementById('nu-branch')?.value || 'พิษณุโลก';

  if (!name || !username || !password) { Toast.show('กรุณากรอกข้อมูลให้ครบ', 'error'); return; }
  if (DB.getUserByUsername && DB.getUserByUsername(username)) { Toast.show('Username นี้ถูกใช้แล้ว', 'error'); return; }

  DB.saveUser({ name, nickname: nick || name.split(' ')[0], username, password, role, branch });
  Toast.show(`เพิ่มผู้ใช้ ${name} เรียบร้อย`, 'success');
  admRenderUsers(document.getElementById('adm-body'));
}

// ── System Logs ───────────────────────────────────────────
function admRenderLogs(body) {
  const sysLogs = DB.getSystemLogs ? DB.getSystemLogs() : [];
  const users = DB.getUsers();

  body.innerHTML = `
  <div class="filter-bar" style="margin-bottom:12px;">
    <div class="filter-group">
      <label class="filter-label">ผู้ใช้</label>
      <select class="filter-select" id="slog-user" onchange="admFilterLogs()">
        <option value="">ทุกคน</option>
        ${users.map(u => `<option value="${u.id}">${u.nickname}</option>`).join('')}
      </select>
    </div>
    <div class="filter-group">
      <label class="filter-label">จากวันที่</label>
      <input type="date" class="filter-input" id="slog-from" onchange="admFilterLogs()" />
    </div>
    <div class="filter-actions">
      <button class="btn btn-ghost btn-sm" onclick="admExportSysLogs()"><i data-lucide="download"></i> Export</button>
    </div>
  </div>
  <div class="glass-card" style="padding:0;overflow:hidden;">
    <div class="table-wrap" style="border:none;border-radius:0;" id="slog-table">
      ${admSysLogTable(sysLogs)}
    </div>
  </div>`;
  lucide.createIcons();
}

function admSysLogTable(logs) {
  if (!logs.length) return `<div class="empty-state" style="padding:32px;"><i data-lucide="activity"></i><h4>ยังไม่มี System Log</h4></div>`;
  return `<table>
    <thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>สาขา</th><th>การกระทำ</th><th>รายละเอียด</th><th>IP (สมมติ)</th></tr></thead>
    <tbody>
      ${logs.map(l => `<tr>
        <td class="nowrap" style="font-size:0.78rem;">${formatDateTime(l.createdAt)}</td>
        <td>${getUserName(l.userId)}</td>
        <td>${l.branch||'-'}</td>
        <td><span class="badge badge-pending">${l.action||'-'}</span></td>
        <td style="font-size:0.8rem;max-width:200px;">${l.detail||'-'}</td>
        <td style="font-size:0.75rem;color:var(--gray-400);">192.168.1.${Math.floor(Math.random()*50)+10}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function admFilterLogs() {
  const uid = document.getElementById('slog-user')?.value;
  const from = document.getElementById('slog-from')?.value;
  let logs = DB.getSystemLogs ? DB.getSystemLogs() : [];
  if (uid) logs = logs.filter(l => l.userId === uid);
  if (from) logs = logs.filter(l => (l.createdAt||'') >= from);
  const table = document.getElementById('slog-table');
  if (table) { table.innerHTML = admSysLogTable(logs); lucide.createIcons(); }
}

function admExportSysLogs() {
  const logs = DB.getSystemLogs ? DB.getSystemLogs() : [];
  const rows = [['เวลา','ผู้ใช้','สาขา','การกระทำ','รายละเอียด']];
  logs.forEach(l => rows.push([l.createdAt, getUserName(l.userId), l.branch, l.action, l.detail]));
  const csv = rows.map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download = `system_logs_${todayISO()}.csv`;
  a.click();
}
