// ts/DualSimplexSolver.ts
import {BaseSimplexSolver} from "./BaseSimplexSolver";
import {Fraction} from "./Fraction";
import {Tableau} from "./Interfaces";
export class DualSimplexSolver extends BaseSimplexSolver {

    /**
     * Основний метод розв'язання двоїстим симплекс-методом
     */
    public solve(data: any): Tableau[] {
        const history: Tableau[] = [];

        // 1. Побудова початкової таблиці (isDual = true активує множення на -1 для знаків >=)
        let matrix = this.prepareTableau(data, true);

        // Початковий базис (індекси slack-змінних)
        let basis = Array.from({ length: data.m }, (_, i) => data.n + i);

        history.push({
            matrix: this.cloneMatrix(matrix),
            basis: [...basis],
            description: "Початкова таблиця (двоїстий метод). Перевірка допустимості плану."
        });

        // Основний цикл: у двоїстому методі ми спочатку шукаємо рядок, потім стовпець
        for (let iter = 1; iter <= 40; iter++) {

            // 2. Вибір розрізного РЯДКА (Критерій виходу з базису)
            // Шукаємо найбільш від'ємне b_i у стовпці B
            const pRow = this.findPivotRow(matrix);

            // Якщо від'ємних елементів у B немає — план став допустимим (і він уже оптимальний)
            if (pRow === -1) {
                history[history.length - 1].description += " (Оптимальний допустимий план знайдено)";
                break;
            }

            // 3. Вибір розрізного СТОВПЦЯ (Критерій введення в базис)
            // Використовуємо двоїсте симплекс-відношення
            const pCol = this.findPivotColumn(matrix, pRow);

            if (pCol === -1) {
                throw new Error("Задача не має розв'язку (область допустимих планів порожня)");
            }

            // Зберігаємо координати розрізного елемента для підсвічування
            history[history.length - 1].pivotRow = pRow;
            history[history.length - 1].pivotCol = pCol;

            // 4. ПЕРЕРАХУНОК (Метод Жордана-Гаусса з батьківського класу)
            matrix = this.gaussJordan(matrix, pRow, pCol);

            // Оновлення базису
            basis[pRow] = pCol;

            history.push({
                matrix: this.cloneMatrix(matrix),
                basis: [...basis],
                description: `Ітерація №${iter}: Змінна x${pCol + 1} входить у базис замість x${history[history.length-1].basis[pRow] + 1}`
            });
        }

        return history;
    }

    /**
     * Пошук розрізного рядка: найбільш від'ємний елемент у стовпці B
     */
    protected findPivotRow(matrix: Fraction[][]): number {
        const lastCol = matrix[0].length - 1;
        let minIdx = -1;
        let minVal = new Fraction(0);

        // Перевіряємо всі рядки, крім останнього (рядка Z)
        for (let i = 0; i < matrix.length - 1; i++) {
            const bValue = matrix[i][lastCol];
            if (bValue.isNegative()) {
                // Шукаємо мінімум (найбільше за модулем від'ємне число)
                if (minIdx === -1 || bValue.sub(minVal).isNegative()) {
                    minVal = bValue;
                    minIdx = i;
                }
            }
        }
        return minIdx;
    }

    /**
     * Пошук розрізного стовпця: мінімальне відношення оцінок Z к розрізному рядку
     * Формула: min |z_j / a_rj| для всіх a_rj < 0
     */
    protected findPivotColumn(matrix: Fraction[][], pRow: number): number {
        const zRow = matrix[matrix.length - 1];
        let minIdx = -1;
        let minRatio: Fraction | null = null;

        // Переглядаємо коефіцієнти в обраному розрізному рядку (крім вільного члена B)
        for (let j = 0; j < matrix[pRow].length - 1; j++) {
            const a_rj = matrix[pRow][j];

            // Розглядаємо тільки від'ємні елементи розрізного рядка
            if (a_rj.isNegative()) {
                // Відношення: Z_j / a_rj
                const ratio = zRow[j].div(a_rj);

                // Беремо модуль відношення
                const absRatio = new Fraction(Math.abs(ratio.num), ratio.den);

                if (minIdx === -1 || absRatio.sub(minRatio!).isNegative()) {
                    minRatio = absRatio;
                    minIdx = j;
                }
            }
        }
        return minIdx;
    }
}