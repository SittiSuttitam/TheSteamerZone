const $ = (id) => document.getElementById(id);

const statusDot = $('statusDot');
const statusText = $('statusText');
const checklist = $('checklist');
const roomCode = $('roomCode');
const logBox = $('logBox');
const pillWeb = $('pillWeb');
const pillProgram = $('pillProgram');
const linkMessage = $('linkMessage');
const linkBanner = $('linkBanner');

let paths = null;

function appendLog(text) {
  logBox.textContent += text;
  logBox.scrollTop = logBox.scrollHeight;
}

function renderChecklist(steps) {
  checklist.innerHTML = '';
  if (!steps?.length) return;
  for (const s of steps) {
    const li = document.createElement('li');
    li.className = s.ok ? 'ok' : 'pending';
    li.textContent = (s.ok ? '✓ ' : '○ ') + s.label;
    if (s.hint && !s.ok) {
      const small = document.createElement('span');
      small.className = 'step-hint';
      small.textContent = s.hint;
      li.appendChild(document.createElement('br'));
      li.appendChild(small);
    }
    checklist.appendChild(li);
  }
}

function setLinkBanner(setup, healthOk) {
  const linked = !!setup?.webLinked;
  const programOpen = !!setup?.desktopAppOpen;
  pillWeb.className = linked ? 'pill pill-on' : 'pill pill-wait';
  pillProgram.className = programOpen ? 'pill pill-on' : 'pill pill-off';
  linkBanner.className = linked ? 'card link-banner linked' : 'card link-banner';

  if (!programOpen && healthOk) {
    linkMessage.textContent = 'รอเปิดหน้าต่างโปรแกรม…';
    roomCode.style.display = 'none';
    return;
  }

  if (linked) {
    linkMessage.textContent = 'เว็บกับโปรแกรมเชื่อมกันแล้ว ✓';
    if (setup.roomCode) {
      roomCode.textContent = `รหัสห้อง ${setup.roomCode}`;
      roomCode.style.display = 'block';
    } else {
      roomCode.style.display = 'none';
    }
  } else {
    linkMessage.textContent = 'รอเว็บกด「เชื่อมต่อทั้งหมด」';
    roomCode.style.display = 'none';
  }

  if (setup?.tiktokConnected) {
    linkMessage.textContent += ' · TikTok ไลฟ์อยู่';
  }
}

function setStatus(setup, healthOk) {
  setLinkBanner(setup, healthOk);
  if (setup?.ready) {
    statusDot.className = 'dot dot-on';
    statusText.textContent = 'พร้อมไลฟ์';
  } else if (setup?.needsAdminSetup) {
    statusDot.className = 'dot dot-warn';
    statusText.textContent = 'โปรแกรมยังไม่พร้อมแจกจ่าย';
  } else if (setup?.webLinked) {
    statusDot.className = 'dot dot-warn';
    statusText.textContent = 'เชื่อมเว็บแล้ว — รอ TikTok ตอนไลฟ์';
  } else {
    statusDot.className = 'dot dot-off';
    statusText.textContent = 'รอเชื่อมจากเว็บ';
  }
  renderChecklist(setup?.steps);
}

async function refresh() {
  const r = await window.tsz.getStatus();
  if (!r.ok) {
    setStatus({ ready: false, webLinked: false, desktopAppOpen: false, steps: [] }, false);
    statusText.textContent = 'กำลังเริ่ม…';
    linkMessage.textContent = 'กำลังเริ่มโปรแกรม…';
    return;
  }
  const setup = r.data?.setup ?? r.data;
  if (setup && r.data?.desktopAppOpen != null) {
    setup.desktopAppOpen = r.data.desktopAppOpen;
  }
  setStatus(setup, true);
}

async function init() {
  paths = await window.tsz.getPaths();
  const logs = await window.tsz.getLogs();
  if (logs) logBox.textContent = logs;

  window.tsz.onLog((line) => appendLog(line));
  window.tsz.onConnectorStopped(() => {
    statusText.textContent = 'หยุดชั่วคราว';
  });

  $('btnWebSetup').onclick = () =>
    window.tsz.openExternal(`${paths.dashboardUrl}/app/connection`);
  $('btnWidgets').onclick = () =>
    window.tsz.openExternal(`${paths.dashboardUrl}/app/widgets`);
  $('btnData').onclick = () => void window.tsz.openPath(paths.dataDir);

  await refresh();
  setInterval(refresh, 3000);
}

init();
