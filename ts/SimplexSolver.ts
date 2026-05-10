import { BaseSimplexSolver } from './BaseSimplexSolver';
import { Fraction } from './Fraction';
import {Tableau} from "./Interfaces";

export class SimplexSolver extends BaseSimplexSolver {
    public solve(data: any): Tableau[] {
        const history: Tableau[] = [];
        let matrix = this.prepareTableau(data, false); // false = не двоїстий
        let basis = Array.from({ length: data.m }, (_, i) => data.n + i);

        history.push({
            matrix: this.cloneMatrix(matrix),
            basis: [...basis],
            description: "Початкова опорна симплекс-таблиця"
        });

        for (let iter = 1; iter <= 50; iter++) {
            // КЛАСИКА: Спочатку СТОВПЕЦЬ, потім РЯДОК
            const pCol = this.findPivotColumn(matrix);
            if (pCol === -1) {
                history[history.length - 1].description += " (Оптимально)";
                break;
            }

            const pRow = this.findPivotRow(matrix, pCol);
            if (pRow === -1) throw new Error("Цільова функція не обмежена.");

            history[history.length - 1].pivotCol = pCol;
            history[history.length - 1].pivotRow = pRow;

            matrix = this.gaussJordan(matrix, pRow, pCol);
            basis[pRow] = pCol;

            history.push({
                matrix: this.cloneMatrix(matrix),
                basis: [...basis],
                description: `Ітерація №${iter}: Введення x${pCol + 1}`
            });
        }
        return history;
    }

    protected findPivotColumn(matrix: Fraction[][]): number {
        const zRow = matrix[matrix.length - 1];
        let minIdx = -1;
        let minVal = new Fraction(0);

        for (let j = 0; j < zRow.length - 1; j++) {
            // Тут уважно: якщо MIN і ти не інвертував знаки в prepareTableau,
            // треба шукати ДОДАТНІ. Але ми домовились все зводити до MAX.
            if (zRow[j].isNegative()) {
                if (minIdx === -1 || zRow[j].sub(minVal).isNegative()) {
                    minVal = zRow[j];
                    minIdx = j;
                }
            }
        }
        return minIdx;
    }

    protected findPivotRow(matrix: Fraction[][], col: number): number {
        let minRow = -1;
        let minRatio: Fraction | null = null;
        const lastCol = matrix[0].length - 1;

        for (let i = 0; i < matrix.length - 1; i++) {
            const val = matrix[i][col];
            if (val.num > 0) { // Тільки додатні для класичного методу
                const ratio = matrix[i][lastCol].div(val);
                if (minRow === -1 || ratio.sub(minRatio!).isNegative()) {
                    minRatio = ratio;
                    minRow = i;
                }
            }
        }
        return minRow;
    }
}