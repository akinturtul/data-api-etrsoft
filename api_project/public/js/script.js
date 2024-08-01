function toggleRow(id) {
    const rows = document.querySelectorAll('.parent-' + id);
    const button = document.querySelector(`#row-${id} .toggle-btn`);
    let isExpanded = button.textContent === '-';
    
    rows.forEach(row => {
        row.classList.toggle('hidden');
        if (row.classList.contains('expandable') && !isExpanded) {
            const childId = row.id.split('-')[2];
            const childRows = document.querySelectorAll('.parent-' + childId);
            childRows.forEach(childRow => childRow.classList.add('hidden'));
        }
    });
    
    button.textContent = isExpanded ? '+' : '-';
}

function formatNumber(num) {
    if (num === null || num === undefined || num === '') {
        return '0,00';
    }
    return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function searchTable() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#hesapTablosu tbody tr');

    rows.forEach(row => {
        const cells = row.getElementsByTagName('td');
        let match = false;

        for (let i = 0; i < cells.length; i++) {
            if (cells[i].innerText.toLowerCase().includes(input)) {
                match = true;
                break;
            }
        }

        row.style.display = match ? '' : 'none';
    });
}

document.getElementById('searchBtn').addEventListener('click', searchTable);
document.getElementById('searchInput').addEventListener('keyup', searchTable);

fetch('/api/data')
    .then(response => response.json())
    .then(data => {
        const tableBody = document.querySelector('#hesapTablosu tbody');
        
        data.forEach(item => {
            const row = document.createElement('tr');
            const id = item.hesap_kodu.replace(/\./g, '-');
            const parentId = item.seviye === 1 ? item.hesap_kodu.slice(0, 3) : 
                             item.seviye === 2 ? item.hesap_kodu.split('.').slice(0, -1).join('-') : 
                             '';
            const expandable = data.some(child => 
                child.hesap_kodu.startsWith(item.hesap_kodu + '.') || 
                (item.tipi === 'G' && child.hesap_kodu.startsWith(item.hesap_kodu))
            );
            
            const balanceClass = parseFloat(item.bakiye) < 0 ? 'negative-balance' : '';

            row.id = `row-${id}`;
            row.className = `${parentId ? 'parent-' + parentId + ' hidden' : ''} ${expandable ? 'expandable' : ''} ${balanceClass}`;

            const indent = '&nbsp;'.repeat(item.seviye * 4);
            const toggleBtn = expandable ? `<span class="toggle-btn" onclick="event.stopPropagation(); toggleRow('${id}')">+</span>` : '';
            row.innerHTML = `
                <td>${indent}${toggleBtn} ${item.hesap_kodu}</td>
                <td>${item.hesap_adi}</td>
                <td>${formatNumber(item.borc)} ₺</td>
                <td>${formatNumber(item.alacak)} ₺</td>
                <td>${formatNumber(item.bakiye)} ₺</td>
            `;

            tableBody.appendChild(row);
        });

        document.querySelectorAll('tr[class="expandable"]').forEach(row => row.classList.remove('hidden'));
    })
    .catch(error => console.error('Veri yükleme hatası:', error));

window.onscroll = function() {
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
        scrollToTopBtn.classList.add('show');
    } else {
        scrollToTopBtn.classList.remove('show');
    }
};

document.getElementById('scrollToTopBtn').onclick = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};