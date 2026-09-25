const $ = (id) => document.getElementById(id);
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const regions = { national: { daycare: 16000, nanny: 42000, family: 9500 }, northeast: { daycare: 21000, nanny: 52000, family: 12000 }, west: { daycare: 20000, nanny: 50000, family: 11500 }, south: { daycare: 12500, nanny: 35000, family: 7500 }, midwest: { daycare: 13500, nanny: 36000, family: 8000 } };
const value = (id) => Number($(id).value) || 0;
const checked = (id) => $(id).checked;

function showOptional(toggleId, sectionId) {
  const refresh = () => document.querySelectorAll(`#${sectionId} .optional-content`).forEach((el) => el.classList.toggle('is-hidden', !checked(toggleId)));
  $(toggleId).addEventListener('change', refresh); refresh();
}
function mortgagePayment(principal, rate, years) { const r = rate / 100 / 12; const n = years * 12; return r ? principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) * 12 : principal / years; }
function retirementProjection(mode) {
  const hasKids = mode !== 'baseline' && checked('hasChildren');
  const isStayHome = mode === 'stayhome';
  const currentAge = value('yourAge');
  const partnerIncome = checked('hasPartner') ? value('partnerSalary') : 0;
  const yearsToFirst = value('firstChildYear'); const children = value('numberChildren');
  const target = value('retirementSpending') / (value('withdrawalRate') / 100);
  let savings = value('currentSavings'); let income = value('yourSalary') + partnerIncome;
  const baseExpenses = value('annualExpenses'); let age = currentAge; let year = 0;
  while (savings < target && year < 55) {
    let expenses = baseExpenses;
    if (checked('hasHome') && year === value('homeYear')) savings -= value('homePrice') * value('downPayment') / 100;
    if (checked('hasHome') && year >= value('homeYear') && year < value('homeYear') + value('mortgageTerm')) {
      const loan = value('homePrice') * (1 - value('downPayment') / 100); expenses += mortgagePayment(loan, value('mortgageRate'), value('mortgageTerm')) + value('homeUpkeep');
    }
    if (hasKids && year >= yearsToFirst) {
      const childYear = year - yearsToFirst;
      expenses += children * (value('collegeSavings') + value('giftCost'));
      if (childYear < value('childcareYears')) expenses += children * value('childcareCost');
      if (isStayHome && childYear < value('stayHomeYears')) income -= value('stayHomeSalary');
    }
    if (checked('hasHelp') && year < value('helpYears')) expenses += value('helpCost');
    savings = Math.max(0, savings * (1 + value('returnRate') / 100) + Math.max(0, income * (1 - value('taxRate') / 100) - expenses));
    income *= 1 + value('incomeGrowth') / 100; age++; year++;
  }
  return { name: mode === 'baseline' ? 'No children' : isStayHome ? 'Children + stay home' : 'Children + paid care', age: savings >= target ? age : null, years: savings >= target ? year : null, target };
}
function render() {
  const scenarios = [retirementProjection('baseline')];
  if (checked('hasChildren')) { scenarios.push(retirementProjection('care')); if (checked('stayHome')) scenarios.push(retirementProjection('stayhome')); }
  const baseline = scenarios[0];
  $('baselineAge').textContent = baseline.age ? baseline.age : '—';
  $('baselineYear').textContent = baseline.age ? `in about ${baseline.years} years` : 'Not reached in 55 years';
  $('targetPortfolio').textContent = money.format(baseline.target);
  $('resultsMessage').textContent = baseline.age ? `Your target assumes ${money.format(value('retirementSpending'))} of annual spending in today’s dollars.` : 'The current assumptions do not reach the target in 55 years. Consider increasing savings, reducing spending, or revisiting the target.';
  $('scenarioCards').innerHTML = scenarios.map((s) => `<article class="scenario-card"><span class="scenario-age">${s.age || '—'}</span><h3>${s.name}</h3><p>${s.age ? `${s.years} years to retirement` : 'Target not reached in 55 years'}</p></article>`).join('');
  const max = Math.max(...scenarios.map((s) => s.years || 55));
  $('barChart').innerHTML = scenarios.map((s) => `<div class="bar-row"><span>${s.name.replace('Children + ', '')}</span><div class="bar" style="width:${((s.years || 55) / max) * 100}%"></div><strong>${s.age || '—'}</strong></div>`).join('');
  window.latestScenarios = scenarios;
}
function setupRegionalEstimate() { const update = () => { $('childcareCost').value = regions[$('childcareRegion').value][$('careType').value]; render(); }; $('childcareRegion').addEventListener('change', update); $('careType').addEventListener('change', update); }
$('hasPartner').addEventListener('change', () => $('partnerFields').classList.toggle('is-hidden', !checked('hasPartner')));
$('stayHome').addEventListener('change', () => $('stayHomeFields').classList.toggle('is-hidden', !checked('stayHome')));
showOptional('hasChildren', 'childrenSection'); showOptional('hasHome', 'homeSection'); showOptional('hasHelp', 'helpSection'); setupRegionalEstimate();
$('planner-form').addEventListener('submit', (event) => { event.preventDefault(); render(); });
$('planner-form').addEventListener('input', render);
$('emailResults').addEventListener('click', () => { const data = window.latestScenarios || []; const lines = data.map((s) => `• ${s.name}: ${s.age ? `retirement age ${s.age} (about ${s.years} years)` : 'target not reached within 55 years'}`).join('\n'); const body = `My private financial-calculator summary\n\n${lines}\n\nTarget portfolio: ${$('targetPortfolio').textContent}\n\nThis is an educational projection in today’s dollars, not financial advice.`; window.location.href = `mailto:?subject=${encodeURIComponent('My financial calculator summary')}&body=${encodeURIComponent(body)}`; });
render();
