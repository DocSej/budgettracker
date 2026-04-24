// ============================================================
//  BudgetU — Student Budget & Expense Tracker
//  app.js
// ============================================================

// ---------- STATE ----------
let state = {
  budget: 0,
  expenses: [],
  income: [],
};

let breakdownView = 'daily';

const CAT_ICONS = {
  Food: 'fa-utensils',
  Transport: 'fa-bus',
  School: 'fa-book',
  Leisure: 'fa-gamepad',
  Others: 'fa-ellipsis',
};

const CAT_COLORS = {
  Food: '#ff0080',
  Transport: '#00ffff',
  School: '#ff00ff',
  Leisure: '#00ff88',
  Others: '#ffff00',
};

// ---------- LOAD / SAVE ----------
function loadState() {
  const saved = localStorage.getItem('budgetu_state');
  if (saved) {
    try { state = JSON.parse(saved); } catch (e) {}
  }
  if (!state.income) state.income = [];
}

function saveState() {
  localStorage.setItem('budgetu_state', JSON.stringify(state));
}

// ---------- HELPERS ----------
function formatPeso(n) {
  return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function totalSpent() {
  return state.expenses.reduce((s, e) => s + Number(e.amount), 0);
}

function totalIncomeAmount() {
  return state.income.reduce((s, i) => s + Number(i.amount), 0);
}

function getMonthStart() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

function getDaysLeftInMonth() {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return Math.max(0, lastDay.getDate() - today.getDate() + 1);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------- TOAST ----------
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ---------- ALERT BANNER ----------
function checkAlerts() {
  const banner = document.getElementById('alertBanner');
  const msgEl = document.getElementById('alertMsg');
  const spent = totalSpent();

  if (state.budget <= 0) { banner.style.display = 'none'; return; }

  const pct = spent / state.budget;

  if (pct >= 1) {
    banner.style.display = 'flex';
    banner.className = 'alert-banner danger';
    msgEl.textContent = '⚠️ Budget exceeded! You have gone over your monthly budget.';
  } else if (pct >= 0.75) {
    banner.style.display = 'flex';
    banner.className = 'alert-banner';
    msgEl.textContent = '🔔 You\'re close to your limit — 75% of your budget is used.';
  } else {
    banner.style.display = 'none';
  }
}

// ---------- DASHBOARD UPDATE ----------
function updateDashboard() {
  const spent = totalSpent();
  const income = totalIncomeAmount();
  const remaining = state.budget - spent;
  const pct = state.budget > 0 ? Math.min((spent / state.budget) * 100, 100) : 0;
  const daysLeft = getDaysLeftInMonth();
  const dailyAvg = daysLeft > 0 ? spent / (30 - daysLeft + 1) : 0;
  const savings = income - spent;

  // Update budget display
  document.getElementById('totalBudget').textContent = formatPeso(state.budget);
  document.getElementById('totalSpent').textContent = formatPeso(spent);
  document.getElementById('remainingBudget').textContent = formatPeso(Math.max(remaining, 0));

  // Update progress bar
  const fill = document.getElementById('progressFill');
  const label = document.getElementById('progressLabel');
  fill.style.width = pct + '%';
  fill.className = 'progress-bar-fill';
  if (pct >= 100) fill.classList.add('over');
  else if (pct >= 75) fill.classList.add('warn');

  const realPct = state.budget > 0 ? (spent / state.budget) * 100 : 0;
  label.textContent = realPct.toFixed(1) + '% used';

  // Update budget meta
  document.getElementById('dailyAverage').textContent = formatPeso(dailyAvg);
  document.getElementById('daysLeft').textContent = daysLeft > 0 ? daysLeft + ' days' : 'Month ended';
  document.getElementById('savingsAmount').textContent = formatPeso(Math.max(savings, 0));

  // Update income
  document.getElementById('totalIncome').textContent = formatPeso(income);
  document.getElementById('netBalance').textContent = formatPeso(savings);

  // Toggle budget presets visibility
  const presets = document.getElementById('budgetPresets');
  if (state.budget === 0) {
    presets.style.display = 'block';
  } else {
    presets.style.display = 'none';
  }

  updateCategoryChart();
  updateBreakdown();
  updateTopCategory();
  checkAlerts();
}

// ---------- CATEGORY CHART ----------
function updateCategoryChart() {
  const container = document.getElementById('categoryBars');
  const totals = {};
  state.expenses.forEach(e => {
    totals[e.category] = (totals[e.category] || 0) + Number(e.amount);
  });

  if (Object.keys(totals).length === 0) {
    container.innerHTML = '<p class="empty-msg">No expenses yet.</p>';
    return;
  }

  const max = Math.max(...Object.values(totals));
  const cats = Object.keys(CAT_ICONS);

  container.innerHTML = cats
    .filter(c => totals[c])
    .map(c => {
      const w = ((totals[c] / max) * 100).toFixed(1);
      return `
        <div class="cat-bar-row">
          <span class="cat-bar-label"><i class="fas ${CAT_ICONS[c]}"></i> ${c}</span>
          <div class="cat-bar-track">
            <div class="cat-bar-fill cat-${c.toLowerCase()}" style="width:${w}%"></div>
          </div>
          <span class="cat-bar-amount">${formatPeso(totals[c])}</span>
        </div>`;
    }).join('');
}

// ---------- DAILY BREAKDOWN ----------
function updateBreakdown() {
  const container = document.getElementById('breakdownList');
  
  if (breakdownView === 'daily') {
    const grouped = {};
    state.expenses.forEach(e => {
      grouped[e.date] = (grouped[e.date] || 0) + Number(e.amount);
    });

    const sorted = Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);

    if (sorted.length === 0) {
      container.innerHTML = '<p class="empty-msg">No expenses recorded.</p>';
      return;
    }

    container.innerHTML = sorted.map(([date, amt]) => `
      <div class="breakdown-item">
        <span class="breakdown-date">${formatDate(date)}</span>
        <span class="breakdown-amount">-${formatPeso(amt)}</span>
      </div>`).join('');
  } else {
    // Weekly view
    const weeks = {};
    state.expenses.forEach(e => {
      const date = new Date(e.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      weeks[weekKey] = (weeks[weekKey] || 0) + Number(e.amount);
    });

    const sorted = Object.entries(weeks).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);

    if (sorted.length === 0) {
      container.innerHTML = '<p class="empty-msg">No expenses recorded.</p>';
      return;
    }

    container.innerHTML = sorted.map(([weekStart, amt]) => {
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const label = `${formatDate(weekStart)} - ${formatDate(end.toISOString().split('T')[0])}`;
      return `
        <div class="breakdown-item">
          <span class="breakdown-date">${label}</span>
          <span class="breakdown-amount">-${formatPeso(amt)}</span>
        </div>`;
    }).join('');
  }
}

// ---------- RENDER HISTORY ----------
function renderHistory() {
  const container = document.getElementById('historyList');
  const catFilter = document.getElementById('filterCategory').value;
  const dateFilter = document.getElementById('filterDate').value;

  let filtered = [...state.expenses].sort((a, b) => b.timestamp - a.timestamp);
  if (catFilter !== 'All') filtered = filtered.filter(e => e.category === catFilter);
  if (dateFilter) filtered = filtered.filter(e => e.date === dateFilter);

  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-msg">No expenses match your filter.</p>';
    return;
  }

  container.innerHTML = filtered.map(e => `
    <div class="history-item" data-id="${e.id}">
      <div class="history-icon ${e.category}">
        <i class="fas ${CAT_ICONS[e.category]}"></i>
      </div>
      <div class="history-info">
        <div class="history-cat">${e.category}</div>
        <div class="history-note">${e.note || '—'}</div>
        <div class="history-meta">${formatDate(e.date)}</div>
      </div>
      <span class="history-amount">-${formatPeso(e.amount)}</span>
      <div class="history-actions">
        <button class="btn-icon edit" title="Edit" onclick="openEditModal('${e.id}')">
          <i class="fas fa-pen"></i>
        </button>
        <button class="btn-icon delete" title="Delete" onclick="deleteExpense('${e.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>`).join('');
}

// ---------- TOP CATEGORY --------
function updateTopCategory() {
  const container = document.getElementById('topCategoryWidget');
  const totals = {};
  state.expenses.forEach(e => {
    totals[e.category] = (totals[e.category] || 0) + Number(e.amount);
  });

  if (Object.keys(totals).length === 0) {
    container.innerHTML = '<p class="empty-msg">No expenses yet.</p>';
    return;
  }

  const topCat = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  const [cat, amt] = topCat;
  const pct = ((amt / totalSpent()) * 100).toFixed(1);

  const bgColors = {
    'Food': 'rgba(255,0,128,0.2)',
    'Transport': 'rgba(0,255,255,0.2)',
    'School': 'rgba(255,0,255,0.2)',
    'Leisure': 'rgba(0,255,136,0.2)',
    'Others': 'rgba(255,255,0,0.2)',
  };
  const iconColors = {
    'Food': '#ff0080',
    'Transport': '#00ffff',
    'School': '#ff00ff',
    'Leisure': '#00ff88',
    'Others': '#ffff00',
  };

  container.innerHTML = `
    <div class="top-cat-item">
      <div class="top-cat-info">
        <div class="top-cat-icon" style="background:${bgColors[cat]}; color:${iconColors[cat]};">
          <i class="fas ${CAT_ICONS[cat]}"></i>
        </div>
        <div class="top-cat-details">
          <h4>${cat}</h4>
          <p>${pct}% of total spending</p>
        </div>
      </div>
      <span class="top-cat-amount">${formatPeso(amt)}</span>
    </div>`;
}

// ---------- QUICK BUDGET --------
function setQuickBudget(amount) {
  state.budget = amount;
  saveState();
  updateDashboard();
  showToast(`💰 Budget set to ${formatPeso(amount)}!`);
}

// ---------- QUICK ADD EXPENSE --------
function quickAddExpense(amt, cat, note) {
  const expense = {
    id: generateId(),
    amount: amt,
    category: cat,
    note: note,
    date: today(),
    timestamp: Date.now(),
  };

  state.expenses.push(expense);
  saveState();
  updateDashboard();
  renderHistory();
  showToast(`✅ ${note} added!`);
}

// ---------- BREAKDOWN VIEW --------
function setBreakdownView(view) {
  breakdownView = view;
  document.getElementById('toggleDaily').classList.toggle('active', view === 'daily');
  document.getElementById('toggleWeekly').classList.toggle('active', view === 'weekly');
  updateBreakdown();
}

// ---------- INCOME --------
document.getElementById('addIncomeBtn').addEventListener('click', () => {
  const amt = parseFloat(document.getElementById('incomeAmount').value);
  if (!amt || amt <= 0) { showToast('Please enter a valid income amount.'); return; }

  if (!state.income) state.income = [];
  state.income.push({
    id: generateId(),
    amount: amt,
    date: today(),
    timestamp: Date.now(),
  });

  saveState();
  updateDashboard();
  showToast(`💵 Income added: ${formatPeso(amt)}`);
  document.getElementById('incomeAmount').value = '';
});

// ---------- ADD EXPENSE ----------
let selectedCategory = 'Food';

document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedCategory = btn.dataset.cat;
  });
});

document.getElementById('addExpenseBtn').addEventListener('click', () => {
  const amt = parseFloat(document.getElementById('expenseAmount').value);
  const note = document.getElementById('expenseNote').value.trim();

  if (!amt || amt <= 0) { showToast('Please enter a valid amount.'); return; }

  const expense = {
    id: generateId(),
    amount: amt,
    category: selectedCategory,
    note: note,
    date: today(),
    timestamp: Date.now(),
  };

  state.expenses.push(expense);
  saveState();
  updateDashboard();
  renderHistory();
  showToast('✅ Expense added!');

  document.getElementById('expenseAmount').value = '';
  document.getElementById('expenseNote').value = '';
});

// ---------- DELETE ----------
function deleteExpense(id) {
  state.expenses = state.expenses.filter(e => e.id !== id);
  saveState();
  updateDashboard();
  renderHistory();
  showToast('🗑️ Expense deleted.');
}

// ---------- EDIT ----------
function openEditModal(id) {
  const exp = state.expenses.find(e => e.id === id);
  if (!exp) return;
  document.getElementById('editId').value = id;
  document.getElementById('editAmount').value = exp.amount;
  document.getElementById('editCategory').value = exp.category;
  document.getElementById('editNote').value = exp.note;
  openModal('editModal');
}

document.getElementById('confirmEdit').addEventListener('click', () => {
  const id = document.getElementById('editId').value;
  const amt = parseFloat(document.getElementById('editAmount').value);
  const cat = document.getElementById('editCategory').value;
  const note = document.getElementById('editNote').value.trim();

  if (!amt || amt <= 0) { showToast('Please enter a valid amount.'); return; }

  const exp = state.expenses.find(e => e.id === id);
  if (exp) {
    exp.amount = amt;
    exp.category = cat;
    exp.note = note;
  }

  saveState();
  updateDashboard();
  renderHistory();
  closeModal('editModal');
  showToast('✏️ Expense updated!');
});

document.getElementById('closeEditModal').addEventListener('click', () => closeModal('editModal'));

// ---------- BUDGET MODAL ----------
document.getElementById('openBudgetModal').addEventListener('click', () => openModal('budgetModal'));
document.getElementById('closeBudgetModal').addEventListener('click', () => closeModal('budgetModal'));

document.getElementById('confirmBudget').addEventListener('click', () => {
  const val = parseFloat(document.getElementById('budgetInput').value);
  if (!val || val <= 0) { showToast('Please enter a valid budget amount.'); return; }
  state.budget = val;
  saveState();
  updateDashboard();
  closeModal('budgetModal');
  showToast(`💰 Budget set to ${formatPeso(val)}!`);
  document.getElementById('budgetInput').value = '';
});

// ---------- RESET BUDGET ----------
document.getElementById('resetBudget').addEventListener('click', () => {
  if (!confirm('Reset the monthly budget to ₱0? Your expense history will remain.')) return;
  state.budget = 0;
  saveState();
  updateDashboard();
  showToast('🔄 Budget reset.');
});

// ---------- MODAL HELPERS ----------
function openModal(id) {
  const m = document.getElementById(id);
  m.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  const m = document.getElementById(id);
  m.classList.remove('open');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// ---------- FILTER ----------
document.getElementById('filterCategory').addEventListener('change', renderHistory);
document.getElementById('filterDate').addEventListener('change', renderHistory);

// ---------- THEME TOGGLE ----------
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  localStorage.setItem('budgetu_theme', theme);
}

themeToggle.addEventListener('click', () => {
  const current = document.body.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// Load saved theme
const savedTheme = localStorage.getItem('budgetu_theme') || 'dark';
applyTheme(savedTheme);

// ---------- EXPORT CSV ----------
document.getElementById('exportBtn').addEventListener('click', () => {
  if (state.expenses.length === 0) { showToast('No expenses to export.'); return; }

  const rows = [
    ['Date', 'Category', 'Note', 'Amount (₱)'],
    ...state.expenses.map(e => [e.date, e.category, e.note || '', e.amount]),
    [],
    ['Total Budget', state.budget],
    ['Total Spent', totalSpent()],
    ['Remaining', Math.max(state.budget - totalSpent(), 0)],
  ];

  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BudgetU_${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 CSV exported!');
});

// ---------- KEYBOARD SHORTCUTS ----------
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal('budgetModal');
    closeModal('editModal');
  }
});

// ---------- INIT ----------
loadState();
updateDashboard();
renderHistory();
