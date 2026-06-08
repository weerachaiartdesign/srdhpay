// js/dashboard.js
// Dashboard logic - โหลดข้อมูลและแสดงผล

let deptChart = null;
let stackedChart = null;
let monthlyChart = null;

async function loadDashboard() {
    showLoading('กำลังโหลดข้อมูล Dashboard...');
    try {
        const result = await API.getDashboard();
        hideLoading();
        
        if (!result.success) {
            showToast('ไม่สามารถโหลดข้อมูลได้: ' + (result.message || 'Unknown error'), 'error');
            return;
        }
        
        const data = result.data;
        renderSummaryCards(data.summaryCards);
        renderAvgDays(data.avgProcessDays);
        renderProgressBar(data.progressPercent);
        renderDeptChart(data.deptChart);
        renderStackedChart(data.stackedChart);
        renderMonthlyChart(data.monthlyComparison);
        
        document.getElementById('fiscalYear').innerText = data.fiscalYear || '2569';
        
    } catch (error) {
        hideLoading();
        console.error('Dashboard error:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
}

function renderSummaryCards(cards) {
    const container = document.getElementById('summaryCards');
    if (!container) return;
    
    if (!cards || cards.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center text-gray-500">ไม่มีข้อมูล</div>';
        return;
    }
    
    let html = '';
    for (const card of cards) {
        html += `
            <div class="card p-4 transition-all hover:shadow-lg">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="font-semibold text-gray-700 dark:text-gray-300">${escapeHtml(card.name)}</h3>
                    <span class="text-xs text-gray-500">${card.countPaid} / ${card.countTotal} ฎีกา</span>
                </div>
                <div class="space-y-1 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-500">เบิกแล้ว</span>
                        <span class="font-medium text-green-600 dark:text-green-400">${formatCurrency(card.paidAmount)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">รอตรวจสอบ</span>
                        <span class="font-medium text-yellow-600 dark:text-yellow-400">${formatCurrency(card.waitingAmount)}</span>
                    </div>
                    <div class="flex justify-between border-t pt-1 mt-1">
                        <span class="text-gray-500">ขอเบิกทั้งสิ้น</span>
                        <span class="font-bold text-purple-600">${formatCurrency(card.totalAmount)}</span>
                    </div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

function renderAvgDays(days) {
    const el = document.getElementById('avgDays');
    if (el) el.innerText = days + ' วัน';
}

function renderProgressBar(percent) {
    const bar = document.getElementById('progressBar');
    const text = document.getElementById('progressText');
    if (bar) bar.style.width = percent + '%';
    if (text) text.innerText = percent + '%';
}

function renderDeptChart(data) {
    const ctx = document.getElementById('deptChart')?.getContext('2d');
    if (!ctx) return;
    
    if (deptChart) deptChart.destroy();
    
    deptChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                label: 'จำนวนเงิน (บาท)',
                data: data.map(d => d.value),
                backgroundColor: 'rgba(147, 51, 234, 0.7)',
                borderColor: 'rgba(147, 51, 234, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top' },
                tooltip: { callbacks: { label: (ctx) => formatCurrency(ctx.raw) } }
            },
            scales: {
                y: { ticks: { callback: (val) => formatCurrency(val) } }
            }
        }
    });
}

function renderStackedChart(data) {
    const ctx = document.getElementById('stackedChart')?.getContext('2d');
    if (!ctx) return;
    
    if (stackedChart) stackedChart.destroy();
    
    const datasets = [];
    for (const moneyType of data.moneyTypes) {
        datasets.push({
            label: moneyType,
            data: data.data.map(dept => dept.values[moneyType] || 0),
            backgroundColor: getRandomColor(moneyType),
            stack: 'stack'
        });
    }
    
    stackedChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.departments,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: { y: { stacked: true, ticks: { callback: (val) => formatCurrency(val) } } },
            plugins: { tooltip: { callbacks: { label: (ctx) => formatCurrency(ctx.raw) } } }
        }
    });
}

function renderMonthlyChart(data) {
    const ctx = document.getElementById('monthlyChart')?.getContext('2d');
    if (!ctx) return;
    
    if (monthlyChart) monthlyChart.destroy();
    
    monthlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.months,
            datasets: [
                {
                    label: `ปี ${data.currentYear}`,
                    data: data.currentData,
                    borderColor: 'rgb(147, 51, 234)',
                    backgroundColor: 'rgba(147, 51, 234, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: `ปี ${data.previousYear}`,
                    data: data.previousData,
                    borderColor: 'rgb(168, 85, 247)',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { tooltip: { callbacks: { label: (ctx) => formatCurrency(ctx.raw) } } }
        }
    });
}

function getRandomColor(seed) {
    const colors = ['#9333ea', '#a855f7', '#c084fc', '#e879f9', '#d8b4fe', '#f3e8ff'];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    return colors[Math.abs(hash) % colors.length];
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
