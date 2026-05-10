class AppController {
    constructor() {
        // DOM елементи
        this.navItems = document.querySelectorAll('#nav-menu li');
        this.simplexWS = document.getElementById('workspace-simplex');
        this.transportWS = document.getElementById('workspace-transport');
        this.simplexControls = document.getElementById('simplex-controls');
        this.transportControls = document.getElementById('transport-controls');
        this.viewTitle = document.getElementById('view-title');

        // Елементи симплексу
        this.inputN = document.getElementById('input-n');
        this.inputM = document.getElementById('input-m');

        // Елементи транспортної
        this.inputTM = document.getElementById('input-tm');
        this.inputTN = document.getElementById('input-tn');

        this.currentMethod = 'simplex';
        this.init();
    }

    init() {
        // Навігація
        this.navItems.forEach(item => {
            item.addEventListener('click', () => this.switchMethod(item));
        });

        // Слухачі для симплексу
        this.inputN.addEventListener('input', () => this.renderSimplexMatrix());
        this.inputM.addEventListener('input', () => this.renderSimplexMatrix());

        // Слухачі для транспортної
        this.inputTM.addEventListener('input', () => this.renderTransportMatrix());
        this.inputTN.addEventListener('input', () => this.renderTransportMatrix());

        // Початковий рендер
        this.renderSimplexMatrix();
    }

    switchMethod(element) {
        // Оновлення UI меню
        this.navItems.forEach(i => i.classList.remove('active'));
        element.classList.add('active');

        this.currentMethod = element.getAttribute('data-method');
        this.viewTitle.innerText = element.innerText;

        // Перемикання робочих областей
        if (this.currentMethod === 'transport') {
            this.simplexWS.style.display = 'none';
            this.simplexControls.style.display = 'none';
            this.transportWS.style.display = 'block';
            this.transportControls.style.display = 'flex';
            this.renderTransportMatrix();
        } else {
            this.simplexWS.style.display = 'block';
            this.simplexControls.style.display = 'flex';
            this.transportWS.style.display = 'none';
            this.transportControls.style.display = 'none';
            this.renderSimplexMatrix();
        }
    }

    renderSimplexMatrix() {
        const n = parseInt(this.inputN.value) || 1;
        const m = parseInt(this.inputM.value) || 1;
        const objContainer = document.getElementById('objective-func-container');
        const constrContainer = document.getElementById('constraints-container');

        // Рендер F(x)
        objContainer.innerHTML = '<strong>F(x) = </strong>';
        for (let j = 1; j <= n; j++) {
            objContainer.innerHTML += `<input type="text" class="obj-val" value="0"> <span>x<sub>${j}</sub></span>`;
            if (j < n) objContainer.innerHTML += ' + ';
        }

        // Рендер обмежень
        constrContainer.innerHTML = '';
        for (let i = 1; i <= m; i++) {
            const row = document.createElement('div');
            row.className = 'matrix-row';
            let rowHtml = '';
            for (let j = 1; j <= n; j++) {
                rowHtml += `<input type="text" class="constr-val" value="0"> <span>x<sub>${j}</sub></span>`;
                if (j < n) rowHtml += ' + ';
            }
            rowHtml += `
                <select class="sign-select">
                    <option value="le">≤</option><option value="ge">≥</option><option value="eq">=</option>
                </select>
                <input type="text" class="rhs-val" value="0">
            `;
            row.innerHTML = rowHtml;
            constrContainer.appendChild(row);
        }
    }

    renderTransportMatrix() {
        const m = parseInt(this.inputTM.value) || 2;
        const n = parseInt(this.inputTN.value) || 2;
        const container = document.getElementById('transport-table-container');

        let html = `<thead><tr><th>Постачальники / Споживачі</th>`;
        for (let j = 1; j <= n; j++) html += `<th>B${j}</th>`;
        html += `<th class="stock-header">Запаси (a<sub>i</sub>)</th></tr></thead><tbody>`;

        for (let i = 1; i <= m; i++) {
            html += `<tr><td class="label-cell">A${i}</td>`;
            for (let j = 1; j <= n; j++) {
                // Створюємо "коробку" з двома інпутами
                html += `
                <td class="transport-cell">
                    <div class="cell-combined">
                        <input type="text" class="cell-cost" title="Вартість c${i}${j}" placeholder="c">
                        <input type="text" class="cell-qty" title="Кількість x${i}${j}" placeholder="x">
                    </div>
                </td>`;
            }
            // Стовпчик запасів
            html += `<td class="stock-cell"><input type="text" class="input-main" placeholder="ai"></td></tr>`;
        }

        // Рядок потреб
        html += `<tr><td class="label-cell">Потреби (b<sub>j</sub>)</td>`;
        for (let j = 1; j <= n; j++) {
            html += `<td class="demand-cell"><input type="text" class="input-main" placeholder="bj"></td>`;
        }
        html += `<td class="label-cell">Σ</td></tr></tbody>`;

        container.innerHTML = html;
    }
}

// Запуск контролера
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AppController();
});