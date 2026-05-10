import { BaseSimplexSolver } from './BaseSimplexSolver';
import { Fraction } from './Fraction';
import { SimplexSolver } from './SimplexSolver';
import {Tableau} from "./Interfaces";

export class GomorySolver extends BaseSimplexSolver {

    public solve(data: any): Tableau[] {
        let history: Tableau[] = [];

        // 1. ЕТАП: Розв'язуємо задачу звичайним симплекс-методом (LPP)
        // Ми просто використовуємо іншу стратегію як інструмент
        const simplex = new SimplexSolver();
        history = simplex.solve(data);

        // Беремо останню матрицю з результатів симплексу
        let lastStep = history[history.length - 1];
        let matrix = this.cloneMatrix(lastStep.matrix);
        let basis = [...lastStep.basis];

        // 2. ЕТАП: Цілочисельні січення (макс 10 спроб, щоб не зависнути)
        for (let cutIter = 1; cutIter <= 10; cutIter++) {
            const lastCol = matrix[0].length - 1;
            let fractionalRowIdx = -1;
            let maxFraction = new Fraction(0);

            // Шукаємо змінну в базисі, яка має бути цілою, але вона дробова
            for (let i = 0; i < matrix.length - 1; i++) {
                let frac = matrix[i][lastCol].getFractionalPart();
                // Якщо дробова частина не нуль (з урахуванням точності)
                if (!frac.isZero() && (fractionalRowIdx === -1 || frac.sub(maxFraction).num > 0)) {
                    maxFraction = frac;
                    fractionalRowIdx = i;
                }
            }

            // Якщо всі значення в B вже цілі — ми перемогли
            if (fractionalRowIdx === -1) {
                history.push({
                    matrix: this.cloneMatrix(matrix),
                    basis: [...basis],
                    description: "🎉 Усі змінні цілі. Оптимальний цілочисельний розв'язок знайдено!"
                });
                break;
            }

            // 3. ФОРМУВАННЯ СІЧЕННЯ ГОМОРІ
            // Додаємо новий рядок (обмеження) та новий стовпець (слак-змінну)
            let newRow: Fraction[] = [];
            for (let j = 0; j < matrix[fractionalRowIdx].length; j++) {
                let frac = matrix[fractionalRowIdx][j].getFractionalPart();
                // Січення: -{a_ij}*x_j + s_new = -{b_i}
                newRow.push(new Fraction(-frac.num, frac.den));
            }

            // Розширюємо існуючу матрицю (додаємо стовпець перед B)
            matrix.forEach((row, i) => {
                row.splice(row.length - 1, 0, new Fraction(0));
            });

            // Вставляємо 1 для нової базисної змінної
            newRow.splice(newRow.length - 1, 0, new Fraction(1));

            // Додаємо цей рядок у матрицю перед Z-рядком
            matrix.splice(matrix.length - 1, 0, newRow);

            // Оновлюємо базис: нова змінна заходить у базис
            basis.push(matrix[0].length - 2);

            history.push({
                matrix: this.cloneMatrix(matrix),
                basis: [...basis],
                description: `🧱 Додано січення Гоморі для x${lastStep.basis[fractionalRowIdx] + 1}.`
            });

            // 4. ОПТИМІЗАЦІЯ ДВОЇСТИМ СИМПЛЕКСОМ
            // Оскільки після січення B стало від'ємним, використовуємо двоїстий метод
            matrix = this.applyDualPhase(matrix, basis, history);
        }

        return history;
    }

    private applyDualPhase(matrix: Fraction[][], basis: number[], history: Tableau[]): Fraction[][] {
        let currentMatrix = matrix;

        while (true) {
            const lastCol = currentMatrix[0].length - 1;
            let pRow = -1;

            // Шукаємо найбільш від'ємне B
            for (let i = 0; i < currentMatrix.length - 1; i++) {
                if (currentMatrix[i][lastCol].isNegative()) {
                    if (pRow === -1 || currentMatrix[i][lastCol].sub(currentMatrix[pRow][lastCol]).isNegative()) {
                        pRow = i;
                    }
                }
            }

            if (pRow === -1) break; // План став допустимим

            // Шукаємо розрізний стовпець (тест відношень)
            let pCol = -1;
            let minRatio: Fraction | null = null;
            const zRow = currentMatrix[currentMatrix.length - 1];

            for (let j = 0; j < currentMatrix[pRow].length - 1; j++) {
                if (currentMatrix[pRow][j].isNegative()) {
                    let ratio = zRow[j].div(currentMatrix[pRow][j]);
                    let absRatio = new Fraction(Math.abs(ratio.num), ratio.den);
                    if (pCol === -1 || absRatio.sub(minRatio!).isNegative()) {
                        minRatio = absRatio;
                        pCol = j;
                    }
                }
            }

            if (pCol === -1) throw new Error("Цілочисельного розв'язку не існує (область порожня).");

            // ПЕРЕРАХУНОК: Використовуємо метод батька!
            currentMatrix = this.gaussJordan(currentMatrix, pRow, pCol);
            basis[pRow] = pCol;

            history.push({
                matrix: this.cloneMatrix(currentMatrix),
                basis: [...basis],
                pivotRow: pRow,
                pivotCol: pCol,
                description: "Двоїста ітерація для відновлення допустимості."
            });
        }
        return currentMatrix;
    }
}