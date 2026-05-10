// ts/AppController.ts
import{SimplexSolver} from "./SimplexSolver";
import {DualSimplexSolver} from "./DualSimplexSolver";
import {ISolverStrategy} from "./Interfaces";
import {}  from "./Interfaces";
import {TransportationSolver} from "./TransportationSolver";
import {GomorySolver} from "./GomorySolver";
import {ArtificialBasisSolver} from "./ArtificialBasisSolver";
import {GraphicalSolver} from "./GraphicalSolver";
import {ResultRenderer} from "./ResultRenderer";
import {Fraction} from "./Fraction";


class AppController {
    private navItems: NodeListOf<HTMLElement>;
    private simplexWS: HTMLElement | null;
    private transportWS: HTMLElement | null;
    private simplexControls: HTMLElement | null;
    private transportControls: HTMLElement | null;
    private viewTitle: HTMLElement | null;
    private inputN: HTMLInputElement | null;
    private inputM: HTMLInputElement | null;
    private inputTM: HTMLInputElement | null;
    private inputTN: HTMLInputElement | null;

    private currentMethod: string = 'simplex';

    private solvers: Record<string, ISolverStrategy> = {
        'simplex': new SimplexSolver(),
        'dual': new DualSimplexSolver(),
        'transport': new TransportationSolver(),
        'gomory': new GomorySolver(),
        'big-m': new ArtificialBasisSolver(),
        'graphic': new GraphicalSolver()
    };

    constructor() {
        this.navItems = document.querySelectorAll('#nav-menu li');
        this.simplexWS = document.getElementById('workspace-simplex');
        this.transportWS = document.getElementById('workspace-transport');
        this.simplexControls = document.getElementById('simplex-controls');
        this.transportControls = document.getElementById('transport-controls');
        this.viewTitle = document.getElementById('view-title');

        this.inputN = document.getElementById('input-n') as HTMLInputElement;
        this.inputM = document.getElementById('input-m') as HTMLInputElement;
        this.inputTM = document.getElementById('input-tm') as HTMLInputElement;
        this.inputTN = document.getElementById('input-tn') as HTMLInputElement;

        this.init();
    }

    private init(): void {
        this.navItems.forEach(item => {
            item.addEventListener('click', () => this.switchMethod(item));
        });

        [this.inputN, this.inputM, this.inputTM, this.inputTN].forEach(input => {
            input?.addEventListener('input', () => {
                if (this.currentMethod === 'transport') {
                    this.renderTransportMatrix();
                } else {
                    this.renderSimplexMatrix();
                }
            });
        });

        document.getElementById('solve-btn')?.addEventListener('click', () => this.handleSolve());
        this.renderSimplexMatrix();
    }

    private handleSolve(): void {
        const outputEl = document.getElementById('solution-output');
        const statusEl = document.getElementById('validation-status');

        try {
            if (statusEl) {
                statusEl.innerText = "⏳ Обчислення...";
                statusEl.style.color = "#334155";
            }

            const solver = this.solvers[this.currentMethod];
            if (!solver) throw new Error(`Метод ${this.currentMethod} не знайдено.`);

            const data = (this.currentMethod === 'transport')
                ? this.collectTransportData()
                : this.collectSimplexData();

            const result = solver.solve(data);

            if (outputEl) {
                outputEl.innerHTML = '';

                if (this.currentMethod === 'transport') {
                    ResultRenderer.renderTransport(result, data.costs, outputEl);
                } else if (this.currentMethod === 'graphic') {
                    ResultRenderer.renderGraphical(result, outputEl);
                } else {
                    ResultRenderer.render(result, outputEl);
                }
            }

            if (statusEl) {
                statusEl.innerText = "✓ Розв'язок знайдено";
                statusEl.style.color = "#059669";
            }
        } catch (e: any) {
            console.error("Solver Error:", e);
            if (statusEl) {
                statusEl.innerText = "⚠ Помилка";
                statusEl.style.color = "#ef4444";
            }
            if (outputEl) {
                outputEl.innerHTML = `<div class="card" style="border-left: 4px solid #ef4444;">
                    <p style="color: #ef4444; font-weight: bold;">Помилка обчислень:</p>
                    <p>${e.message}</p>
                </div>`;
            }
        }
    }

    private collectSimplexData(): any {
        const n = parseInt(this.inputN?.value || "0");
        const m = parseInt(this.inputM?.value || "0");
        const target = (document.getElementById('target-type') as HTMLSelectElement)?.value || "max";

        const objective = Array.from(document.querySelectorAll('.obj-val'))
            .slice(0, n)
            .map((el: any) => Fraction.fromString(el.value || "0"));

        const constraints = Array.from(document.querySelectorAll('#constraints-container .matrix-row'))
            .map((row: any) => ({
                coeffs: Array.from(row.querySelectorAll('.constr-val'))
                    .map((el: any) => Fraction.fromString(el.value || "0")),
                rhs: Fraction.fromString((row.querySelector('.rhs-val') as HTMLInputElement).value || "0"),
                sign: (row.querySelector('.sign-select') as HTMLSelectElement).value
            }));

        return { n, m, objective, constraints, target };
    }

    private collectTransportData(): any {
        const m = parseInt(this.inputTM?.value || "2");
        const n = parseInt(this.inputTN?.value || "2");
        const costs: Fraction[][] = [];
        const supply: Fraction[] = [];
        const demand: Fraction[] = [];

        const rows = document.querySelectorAll('#transport-table-container tbody tr');
        rows.forEach((row, i) => {
            if (i < m) {
                const rowCosts = Array.from(row.querySelectorAll('.cell-cost'))
                    .map((el: any) => Fraction.fromString(el.value || "0"));
                costs.push(rowCosts);
                const sInput = row.querySelector('.stock-cell .input-main') as HTMLInputElement;
                supply.push(Fraction.fromString(sInput?.value || "0"));
            } else if (i === m) {
                const dInputs = row.querySelectorAll('.demand-cell .input-main');
                dInputs.forEach((input: any) => {
                    demand.push(Fraction.fromString(input.value || "0"));
                });
            }
        });

        return { costs, supply, demand };
    }

    private switchMethod(element: HTMLElement): void {
        this.navItems.forEach(i => i.classList.remove('active'));
        element.classList.add('active');

        this.currentMethod = element.getAttribute('data-method') || 'simplex';
        if (this.viewTitle) this.viewTitle.innerText = element.innerText;

        const outputEl = document.getElementById('solution-output');
        if (outputEl) outputEl.innerHTML = '<p>Введіть умови та натисніть "Розв\'язати"</p>';

        const isTransport = this.currentMethod === 'transport';
        const isMatrixEditor = ['simplex', 'dual', 'gomory', 'big-m', 'graphic'].includes(this.currentMethod);

        if (this.currentMethod === 'graphic') {
            if (this.inputN) {
                this.inputN.value = "2";
                this.inputN.disabled = true;
            }
        } else {
            if (this.inputN) this.inputN.disabled = false;
        }

        this.setElementsDisplay(
            isMatrixEditor ? 'block' : 'none',
            isTransport ? 'block' : 'none'
        );

        if (isTransport) {
            this.renderTransportMatrix();
        } else if (isMatrixEditor) {
            this.renderSimplexMatrix();
        }
    }

    private setElementsDisplay(simplexDisp: string, transportDisp: string): void {
        [this.simplexWS, this.simplexControls].forEach(el => el && (el.style.display = simplexDisp));
        [this.transportWS, this.transportControls].forEach(el => el && (el.style.display = transportDisp));
    }

    public renderSimplexMatrix(): void {
        if (!this.inputN || !this.inputM) return;
        const n = parseInt(this.inputN.value) || 1;
        const m = parseInt(this.inputM.value) || 1;
        const objCont = document.getElementById('objective-func-container');
        const constrCont = document.getElementById('constraints-container');

        if (!objCont || !constrCont) return;

        objCont.innerHTML = '<strong>F(x) = </strong>' + Array.from({length: n}, (_, j) =>
            `<input type="text" class="obj-val" placeholder="0"> <span>x<sub>${j+1}</sub></span>`
        ).join(' + ');

        constrCont.innerHTML = Array.from({length: m}, (_, i) => `
            <div class="matrix-row">
                ${Array.from({length: n}, (_, j) =>
            `<input type="text" class="constr-val" placeholder="0"> <span>x<sub>${j+1}</sub></span>`
        ).join(' + ')} 
                <select class="sign-select">
                    <option value="le">≤</option>
                    <option value="ge">≥</option>
                    <option value="eq">=</option>
                </select> 
                <input type="text" class="rhs-val" placeholder="0">
            </div>
        `).join('');
    }

    public renderTransportMatrix(): void {
        if (!this.inputTM || !this.inputTN) return;
        const m = parseInt(this.inputTM.value) || 2;
        const n = parseInt(this.inputTN.value) || 2;
        const container = document.getElementById('transport-table-container');
        if (!container) return;

        let html = `<thead><tr><th>A \\ B</th>${Array.from({length: n}, (_, j) => `<th>B${j+1}</th>`).join('')}<th>Запаси</th></tr></thead><tbody>`;

        html += Array.from({length: m}, (_, i) => `
            <tr>
                <td class="label-cell">A${i+1}</td>
                ${Array.from({length: n}, () => `
                    <td class="transport-cell">
                        <div class="cell-combined">
                            <input type="text" class="cell-cost" placeholder="c">
                            <input type="text" class="cell-qty" disabled placeholder="-">
                        </div>
                    </td>`).join('')}
                <td class="stock-cell"><input type="text" class="input-main" placeholder="ai"></td>
            </tr>
        `).join('');

        html += `<tr><td class="label-cell">Потреби</td>
            ${Array.from({length: n}, () => `<td class="demand-cell"><input type="text" class="input-main" placeholder="bj"></td>`).join('')}
            <td>Σ</td></tr></tbody>`;

        container.innerHTML = html;
    }
} // <--- Закриває клас AppController

document.addEventListener('DOMContentLoaded', () => {
    console.log("🟢 DOM завантажено. Запускаємо AppController...");
    new AppController();
});