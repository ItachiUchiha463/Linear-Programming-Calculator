import { Fraction } from './Fraction';
import {Tableau} from "./Interfaces";
import {ISolverStrategy} from "./Interfaces";

export abstract class BaseSimplexSolver implements ISolverStrategy {
    protected currentTableau: any; // Стан поточної ітерації

    // Спільний метод для всіх симплекс-подібних
    public abstract solve(data: any): Tableau[];

    // Спільна підготовка таблиці (враховуємо MIN/MAX та знаки)
    protected prepareTableau(data: any, isDual: boolean = false): Fraction[][] {
        const matrix: Fraction[][] = [];

        for (let i = 0; i < data.m; i++) {
            const row: Fraction[] = [];
            const constr = data.constraints[i];

            // Якщо двоїстий і знак >=, інвертуємо рядок
            const rowMult = (isDual && constr.sign === 'ge') ? -1 : 1;

            for (let j = 0; j < data.n; j++) {
                row.push(constr.coeffs[j].mul(new Fraction(rowMult)));
            }
            // Базис (одинична матриця)
            for (let j = 0; j < data.m; j++) {
                row.push(new Fraction(i === j ? 1 : 0));
            }
            row.push(constr.rhs.mul(new Fraction(rowMult)));
            matrix.push(row);
        }

        // Рядок Z (Цільова функція)
        const zRow: Fraction[] = [];
        for (let j = 0; j < data.n; j++) {
            // Для MAX: -Cj, для MIN: Cj (через MAX -F)
            const val = data.target === 'max' ? -1 : 1;
            zRow.push(data.objective[j].mul(new Fraction(val)));
        }
        for (let j = 0; j <= data.m; j++) zRow.push(new Fraction(0));
        matrix.push(zRow);

        return matrix;
    }

    // Алгоритм Жордана-Гаусса (спільний для всіх)
    protected gaussJordan(matrix: Fraction[][], pRow: number, pCol: number): Fraction[][] {
        const pivot = matrix[pRow][pCol];
        const res = matrix.map(row => row.map(cell => cell));

        res[pRow] = res[pRow].map(cell => cell.div(pivot));
        for (let i = 0; i < res.length; i++) {
            if (i !== pRow) {
                const factor = res[i][pCol] ;
                for (let j = 0; j < res[i].length; j++) {
                    res[i][j] = res[i][j].sub(factor.mul(res[pRow][j]));
                }
            }
        }
        return res;
    }

    protected cloneMatrix = (m: Fraction[][]) => m.map(r => [...r]);
}