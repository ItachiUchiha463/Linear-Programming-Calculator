import {BaseSimplexSolver} from "./BaseSimplexSolver";
import {Fraction} from "./Fraction";
import {Tableau} from "./Interfaces";
export class ArtificialBasisSolver extends BaseSimplexSolver {
    // Не роби M занадто великим, щоб не переповнити Fraction, 10^7 достатньо
    private M_VALUE = new Fraction(10000000, 1);

    public solve(data: any): Tableau[] {
        const history: Tableau[] = [];

        // 1. Побудова та обов'язкова нормалізація рядка Z
        let matrix = this.prepareArtificialTableau(data);

        // Визначаємо початковий базис (slack або artificial)
        let basis: number[] = [];
        for (let i = 0; i < data.m; i++) {
            if (data.constraints[i].sign === 'le' && !data.constraints[i].rhs.isNegative()) {
                basis.push(data.n + i); // slack
            } else {
                // Штучна змінна завжди в кінці матриці (n + m + i)
                basis.push(data.n + data.m + i);
            }
        }

        history.push({
            matrix: this.cloneMatrix(matrix),
            basis: [...basis],
            description: "Початкова М-таблиця. Проведено нормалізацію штучних змінних."
        });

        for (let iter = 1; iter <= 50; iter++) {
            const pCol = this.findPivotColumn(matrix);

            // Критерій оптимальності
            if (pCol === -1) {
                this.checkArtificials(matrix, basis, data);
                history[history.length - 1].description += " (Оптимально)";
                break;
            }

            const pRow = this.findPivotRow(matrix, pCol);

            if (pRow === -1) {
                throw new Error("Цільова функція не обмежена. Система має відкриту область у напрямку оптимуму.");
            }

            history[history.length - 1].pivotCol = pCol;
            history[history.length - 1].pivotRow = pRow;

            matrix = this.gaussJordan(matrix, pRow, pCol);
            basis[pRow] = pCol;

            history.push({
                matrix: this.cloneMatrix(matrix),
                basis: [...basis],
                description: `Ітерація №${iter}: x${pCol + 1} заходить у базис.`
            });
        }
        return history;
    }

    private prepareArtificialTableau(data: any): Fraction[][] {
        const n = data.n;
        const m = data.m;
        const matrix: Fraction[][] = [];

        for (let i = 0; i < m; i++) {
            const row: Fraction[] = [];
            const c = data.constraints[i];
            // М-метод вимагає B >= 0. Якщо від'ємне — множимо все на -1
            const mF = new Fraction(c.rhs.isNegative() ? -1 : 1);
            let currentSign = c.sign;
            if (c.rhs.isNegative()) {
                currentSign = (currentSign === 'le' ? 'ge' : (currentSign === 'ge' ? 'le' : 'eq'));
            }

            for (let j = 0; j < n; j++) row.push(c.coeffs[j].mul(mF)); // Основні
            for (let j = 0; j < m; j++) { // Slack/Surplus
                let val = 0;
                if (i === j) {
                    if (currentSign === 'le') val = 1;
                    else if (currentSign === 'ge') val = -1;
                }
                row.push(new Fraction(val));
            }
            for (let j = 0; j < m; j++) { // Artificial
                row.push(new Fraction(i === j && (currentSign === 'ge' || currentSign === 'eq') ? 1 : 0));
            }
            row.push(c.rhs.mul(mF)); // B
            matrix.push(row);
        }

        // Рядок Z: ми ЗАВЖДИ зводимо до задачі MAX для внутрішнього солвера
        const zRow: Fraction[] = [];
        const isMax = data.target === 'max';
        // Якщо MIN f(x), ми максимізуємо -f(x). Коефіцієнти в таблиці (Z - (-c)x + MR = 0)
        for (let j = 0; j < n; j++) {
            zRow.push(isMax ? data.objective[j].mul(new Fraction(-1)) : data.objective[j]);
        }
        for (let j = 0; j < m; j++) zRow.push(new Fraction(0)); // slack
        for (let j = 0; j < m; j++) zRow.push(this.M_VALUE); // Штраф M (завжди позитивний у формі Z + ... + MR = 0)
        zRow.push(new Fraction(0));
        matrix.push(zRow);

        // НОРМАЛІЗАЦІЯ: Обнуляємо коефіцієнти M над штучними змінними
        const zIdx = matrix.length - 1;
        for (let i = 0; i < m; i++) {
            const c = data.constraints[i];
            const currentSign = c.rhs.isNegative() ? (c.sign === 'le' ? 'ge' : 'le') : c.sign;

            if (currentSign === 'ge' || currentSign === 'eq' || c.sign === 'eq') {
                const factor = matrix[zIdx][n + m + i]; // Це наше M
                for (let j = 0; j < matrix[i].length; j++) {
                    matrix[zIdx][j] = matrix[zIdx][j].sub(factor.mul(matrix[i][j]));
                }
            }
        }
        return matrix;
    }

    protected findPivotColumn(matrix: Fraction[][]): number {
        const zRow = matrix[matrix.length - 1];
        let minIdx = -1;
        for (let j = 0; j < zRow.length - 1; j++) {
            if (zRow[j].isNegative()) {
                if (minIdx === -1 || zRow[j].sub(zRow[minIdx]).isNegative()) minIdx = j;
            }
        }
        return minIdx;
    }

    protected findPivotRow(matrix: Fraction[][], col: number): number {
        let minRow = -1;
        let minRatio: Fraction | null = null;
        const lastCol = matrix[0].length - 1;
        for (let i = 0; i < matrix.length - 1; i++) {
            if (matrix[i][col].num > 0) {
                const ratio = matrix[i][lastCol].div(matrix[i][col]);
                if (minRow === -1 || ratio.sub(minRatio!).isNegative()) {
                    minRatio = ratio;
                    minRow = i;
                }
            }
        }
        return minRow;
    }

    private checkArtificials(matrix: Fraction[][], basis: number[], data: any) {
        const n = data.n, m = data.m;
        basis.forEach((bIdx, rowIdx) => {
            if (bIdx >= n + m) { // Якщо штучна змінна залишилась в базисі
                const val = matrix[rowIdx][matrix[0].length - 1];
                if (!val.isZero()) throw new Error("Задача не має допустимих розв'язків (штучні змінні не витіснені).");
            }
        });
    }
}