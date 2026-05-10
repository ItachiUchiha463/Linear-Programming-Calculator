"use strict";
class Fraction {
    constructor(num, den = 1) {
        this.num = num;
        this.den = den;
        this.simplify();
    }
    simplify() {
        if (this.den === 0)
            throw new Error("Знаменник не може бути нулем");
        if (this.den < 0) {
            this.num *= -1;
            this.den *= -1;
        }
        const common = this.gcd(Math.abs(this.num), Math.abs(this.den));
        this.num /= common;
        this.den /= common;
    }
    gcd(a, b) {
        return b === 0 ? a : this.gcd(b, a % b);
    }
    static fromString(str) {
        str = str.trim().replace(',', '.');
        if (str.includes('/')) {
            const [n, d] = str.split('/').map(Number);
            return new Fraction(n, d || 1);
        }
        const val = Number(str);
        if (!Number.isInteger(val)) {
            const parts = str.split('.');
            const den = Math.pow(10, parts[1].length);
            const num = Math.round(val * den);
            return new Fraction(num, den);
        }
        return new Fraction(val, 1);
    }
    // Додай цей метод у клас Fraction
    getFractionalPart() {
        // Математична дробова частина: {x} = x - floor(x)
        let val = this.num / this.den;
        let floorVal = Math.floor(val);
        // Результат: f = x - floorVal
        // (num/den) - floorVal = (num - floorVal * den) / den
        return new Fraction(this.num - floorVal * this.den, this.den);
    }
    add(f) { return new Fraction(this.num * f.den + f.num * this.den, this.den * f.den); }
    sub(f) { return new Fraction(this.num * f.den - f.num * this.den, this.den * f.den); }
    mul(f) { return new Fraction(this.num * f.num, this.den * f.den); }
    div(f) { return new Fraction(this.num * f.den, this.den * f.num); }
    isNegative() { return this.num < 0; }
    isZero() { return this.num === 0; }
    toString() { return this.den === 1 ? `${this.num}` : `${this.num}/${this.den}`; }
}
// ts/BaseSimplexSolver.ts
class BaseSimplexSolver {
    constructor() {
        this.cloneMatrix = (m) => m.map(r => [...r]);
    }
    // Спільна підготовка таблиці (враховуємо MIN/MAX та знаки)
    prepareTableau(data, isDual = false) {
        const matrix = [];
        for (let i = 0; i < data.m; i++) {
            const row = [];
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
        const zRow = [];
        for (let j = 0; j < data.n; j++) {
            // Для MAX: -Cj, для MIN: Cj (через MAX -F)
            const val = data.target === 'max' ? -1 : 1;
            zRow.push(data.objective[j].mul(new Fraction(val)));
        }
        for (let j = 0; j <= data.m; j++)
            zRow.push(new Fraction(0));
        matrix.push(zRow);
        return matrix;
    }
    // Алгоритм Жордана-Гаусса (спільний для всіх)
    gaussJordan(matrix, pRow, pCol) {
        const pivot = matrix[pRow][pCol];
        const res = matrix.map(row => row.map(cell => cell));
        res[pRow] = res[pRow].map(cell => cell.div(pivot));
        for (let i = 0; i < res.length; i++) {
            if (i !== pRow) {
                const factor = res[i][pCol];
                for (let j = 0; j < res[i].length; j++) {
                    res[i][j] = res[i][j].sub(factor.mul(res[pRow][j]));
                }
            }
        }
        return res;
    }
}
/// <reference path="Interfaces.ts" />
class GraphicalSolver {
    solve(data) {
        if (data.n > 2) {
            throw new Error("Графічний метод працює тільки для 2 змінних (x₁ та x₂).");
        }
        const lines = data.constraints.map((c) => ({
            a: c.coeffs[0].num / c.coeffs[0].den,
            b: c.coeffs[1].num / c.coeffs[1].den,
            c: c.rhs.num / c.rhs.den,
            sign: c.sign
        }));
        // 1. Знаходимо всі критичні точки (перетини)
        const points = this.getAllIntersections(lines);
        // 2. Фільтруємо точки, що не входять в ОДР
        const feasiblePoints = points.filter(p => this.isFeasible(p, lines));
        if (feasiblePoints.length === 0) {
            throw new Error("Область допустимих розв'язків порожня!");
        }
        // 3. Обчислюємо Z для кожної точки
        const c1 = data.objective[0].num / data.objective[0].den;
        const c2 = data.objective[1].num / data.objective[1].den;
        const results = feasiblePoints.map(p => ({
            x1: p.x,
            x2: p.y,
            z: c1 * p.x + c2 * p.y
        }));
        // 4. Шукаємо екстремум
        const best = data.target === 'max'
            ? results.reduce((prev, curr) => (curr.z > prev.z) ? curr : prev)
            : results.reduce((prev, curr) => (curr.z < prev.z) ? curr : prev);
        // ПОВЕРТАЄМО РОЗШИРЕНІ ДАНІ
        return {
            points: feasiblePoints,
            lines,
            best,
            objCoeffs: [c1, c2], // Коефіцієнти для вектора та лінії рівня
            target: data.target
        };
    }
    getAllIntersections(lines) {
        const pts = [{ x: 0, y: 0 }];
        // Перетини з осями
        lines.forEach(l => {
            if (Math.abs(l.a) > 1e-9)
                pts.push({ x: l.c / l.a, y: 0 });
            if (Math.abs(l.b) > 1e-9)
                pts.push({ x: 0, y: l.c / l.b });
        });
        // Перетини прямих між собою
        for (let i = 0; i < lines.length; i++) {
            for (let j = i + 1; j < lines.length; j++) {
                const det = lines[i].a * lines[j].b - lines[i].b * lines[j].a;
                if (Math.abs(det) > 1e-9) {
                    pts.push({
                        x: (lines[i].c * lines[j].b - lines[i].b * lines[j].c) / det,
                        y: (lines[i].a * lines[j].c - lines[i].c * lines[j].a) / det
                    });
                }
            }
        }
        return pts.filter(p => p.x >= -1e-9 && p.y >= -1e-9);
    }
    isFeasible(p, lines) {
        return lines.every(l => {
            const val = l.a * p.x + l.b * p.y;
            if (l.sign === 'le')
                return val <= l.c + 1e-7;
            if (l.sign === 'ge')
                return val >= l.c - 1e-7;
            return Math.abs(val - l.c) < 1e-7;
        });
    }
}
/// <reference path="BaseSimplexSolver.ts" />
class ArtificialBasisSolver extends BaseSimplexSolver {
    constructor() {
        super(...arguments);
        // Не роби M занадто великим, щоб не переповнити Fraction, 10^7 достатньо
        this.M_VALUE = new Fraction(10000000, 1);
    }
    solve(data) {
        const history = [];
        // 1. Побудова та обов'язкова нормалізація рядка Z
        let matrix = this.prepareArtificialTableau(data);
        // Визначаємо початковий базис (slack або artificial)
        let basis = [];
        for (let i = 0; i < data.m; i++) {
            if (data.constraints[i].sign === 'le' && !data.constraints[i].rhs.isNegative()) {
                basis.push(data.n + i); // slack
            }
            else {
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
    prepareArtificialTableau(data) {
        const n = data.n;
        const m = data.m;
        const matrix = [];
        for (let i = 0; i < m; i++) {
            const row = [];
            const c = data.constraints[i];
            // М-метод вимагає B >= 0. Якщо від'ємне — множимо все на -1
            const mF = new Fraction(c.rhs.isNegative() ? -1 : 1);
            let currentSign = c.sign;
            if (c.rhs.isNegative()) {
                currentSign = (currentSign === 'le' ? 'ge' : (currentSign === 'ge' ? 'le' : 'eq'));
            }
            for (let j = 0; j < n; j++)
                row.push(c.coeffs[j].mul(mF)); // Основні
            for (let j = 0; j < m; j++) { // Slack/Surplus
                let val = 0;
                if (i === j) {
                    if (currentSign === 'le')
                        val = 1;
                    else if (currentSign === 'ge')
                        val = -1;
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
        const zRow = [];
        const isMax = data.target === 'max';
        // Якщо MIN f(x), ми максимізуємо -f(x). Коефіцієнти в таблиці (Z - (-c)x + MR = 0)
        for (let j = 0; j < n; j++) {
            zRow.push(isMax ? data.objective[j].mul(new Fraction(-1)) : data.objective[j]);
        }
        for (let j = 0; j < m; j++)
            zRow.push(new Fraction(0)); // slack
        for (let j = 0; j < m; j++)
            zRow.push(this.M_VALUE); // Штраф M (завжди позитивний у формі Z + ... + MR = 0)
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
    findPivotColumn(matrix) {
        const zRow = matrix[matrix.length - 1];
        let minIdx = -1;
        for (let j = 0; j < zRow.length - 1; j++) {
            if (zRow[j].isNegative()) {
                if (minIdx === -1 || zRow[j].sub(zRow[minIdx]).isNegative())
                    minIdx = j;
            }
        }
        return minIdx;
    }
    findPivotRow(matrix, col) {
        let minRow = -1;
        let minRatio = null;
        const lastCol = matrix[0].length - 1;
        for (let i = 0; i < matrix.length - 1; i++) {
            if (matrix[i][col].num > 0) {
                const ratio = matrix[i][lastCol].div(matrix[i][col]);
                if (minRow === -1 || ratio.sub(minRatio).isNegative()) {
                    minRatio = ratio;
                    minRow = i;
                }
            }
        }
        return minRow;
    }
    checkArtificials(matrix, basis, data) {
        const n = data.n, m = data.m;
        basis.forEach((bIdx, rowIdx) => {
            if (bIdx >= n + m) { // Якщо штучна змінна залишилась в базисі
                const val = matrix[rowIdx][matrix[0].length - 1];
                if (!val.isZero())
                    throw new Error("Задача не має допустимих розв'язків (штучні змінні не витіснені).");
            }
        });
    }
}
///<reference path="BaseSimplexSolver.ts" />
class SimplexSolver extends BaseSimplexSolver {
    solve(data) {
        const history = [];
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
            if (pRow === -1)
                throw new Error("Цільова функція не обмежена.");
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
    findPivotColumn(matrix) {
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
    findPivotRow(matrix, col) {
        let minRow = -1;
        let minRatio = null;
        const lastCol = matrix[0].length - 1;
        for (let i = 0; i < matrix.length - 1; i++) {
            const val = matrix[i][col];
            if (val.num > 0) { // Тільки додатні для класичного методу
                const ratio = matrix[i][lastCol].div(val);
                if (minRow === -1 || ratio.sub(minRatio).isNegative()) {
                    minRatio = ratio;
                    minRow = i;
                }
            }
        }
        return minRow;
    }
}
// ts/DualSimplexSolver.ts
class DualSimplexSolver extends BaseSimplexSolver {
    /**
     * Основний метод розв'язання двоїстим симплекс-методом
     */
    solve(data) {
        const history = [];
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
                description: `Ітерація №${iter}: Змінна x${pCol + 1} входить у базис замість x${history[history.length - 1].basis[pRow] + 1}`
            });
        }
        return history;
    }
    /**
     * Пошук розрізного рядка: найбільш від'ємний елемент у стовпці B
     */
    findPivotRow(matrix) {
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
    findPivotColumn(matrix, pRow) {
        const zRow = matrix[matrix.length - 1];
        let minIdx = -1;
        let minRatio = null;
        // Переглядаємо коефіцієнти в обраному розрізному рядку (крім вільного члена B)
        for (let j = 0; j < matrix[pRow].length - 1; j++) {
            const a_rj = matrix[pRow][j];
            // Розглядаємо тільки від'ємні елементи розрізного рядка
            if (a_rj.isNegative()) {
                // Відношення: Z_j / a_rj
                const ratio = zRow[j].div(a_rj);
                // Беремо модуль відношення
                const absRatio = new Fraction(Math.abs(ratio.num), ratio.den);
                if (minIdx === -1 || absRatio.sub(minRatio).isNegative()) {
                    minRatio = absRatio;
                    minIdx = j;
                }
            }
        }
        return minIdx;
    }
}
// ts/GomorySolver.ts
class GomorySolver extends BaseSimplexSolver {
    solve(data) {
        let history = [];
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
            let newRow = [];
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
    applyDualPhase(matrix, basis, history) {
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
            if (pRow === -1)
                break; // План став допустимим
            // Шукаємо розрізний стовпець (тест відношень)
            let pCol = -1;
            let minRatio = null;
            const zRow = currentMatrix[currentMatrix.length - 1];
            for (let j = 0; j < currentMatrix[pRow].length - 1; j++) {
                if (currentMatrix[pRow][j].isNegative()) {
                    let ratio = zRow[j].div(currentMatrix[pRow][j]);
                    let absRatio = new Fraction(Math.abs(ratio.num), ratio.den);
                    if (pCol === -1 || absRatio.sub(minRatio).isNegative()) {
                        minRatio = absRatio;
                        pCol = j;
                    }
                }
            }
            if (pCol === -1)
                throw new Error("Цілочисельного розв'язку не існує (область порожня).");
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
class TransportationSolver {
    constructor() {
        this.cloneMatrix = (m) => m.map(row => [...row]);
    }
    // Вхідний параметр тепер один — 'data', щоб відповідати ISolverStrategy
    solve(data) {
        const { costs, supply, demand } = data;
        if (!costs || !supply || !demand) {
            throw new Error("Транспортна задача: Відсутні вхідні дані (тарифи, запаси або потреби)");
        }
        const history = [];
        // 1. Балансування задачі
        // Умова закритої моделі: \sum_{i=1}^{m} a_i = \sum_{j=1}^{n} b_j
        let { balancedCosts, balancedSupply, balancedDemand } = this.balanceTask(costs, supply, demand);
        const m = balancedSupply.length;
        const n = balancedDemand.length;
        let shipments = Array.from({ length: m }, () => Array.from({ length: n }, () => new Fraction(0)));
        let currentSupply = [...balancedSupply];
        let currentDemand = [...balancedDemand];
        history.push({
            matrix: this.cloneMatrix(shipments),
            basis: [],
            description: "Початковий стан: Задача збалансована. Починаємо розподіл методом мінімальної вартості."
        });
        // 2. Основний цикл методу мінімальної вартості
        while (true) {
            let minCost = null;
            let targetCell = null;
            for (let i = 0; i < m; i++) {
                if (currentSupply[i].isZero())
                    continue;
                for (let j = 0; j < n; j++) {
                    if (currentDemand[j].isZero())
                        continue;
                    const cost = balancedCosts[i][j];
                    if (minCost === null || cost.sub(minCost).isNegative()) {
                        minCost = cost;
                        targetCell = { r: i, c: j };
                    }
                }
            }
            if (!targetCell)
                break;
            const { r, c } = targetCell;
            const s = currentSupply[r];
            const d = currentDemand[c];
            // val = min(запас, потреба)
            const val = s.sub(d).isNegative() ? s : d;
            shipments[r][c] = val;
            currentSupply[r] = s.sub(val);
            currentDemand[c] = d.sub(val);
            history.push({
                matrix: this.cloneMatrix(shipments),
                basis: [],
                pivotRow: r,
                pivotCol: c,
                description: `Призначено ${val.toString()} од. у комірку A${r + 1}-B${c + 1} (min тариф: ${balancedCosts[r][c].toString()})`
            });
        }
        return history;
    }
    balanceTask(costs, supply, demand) {
        let sumS = new Fraction(0);
        let sumD = new Fraction(0);
        supply.forEach(s => sumS = sumS.add(s));
        demand.forEach(d => sumD = sumD.add(d));
        let balancedCosts = costs.map(row => [...row]);
        let balancedSupply = [...supply];
        let balancedDemand = [...demand];
        const diff = sumS.sub(sumD);
        if (!diff.isZero()) {
            if (diff.isNegative()) {
                // Дефіцит запасів -> Додаємо фіктивний рядок (dummy supplier)
                const dummyRow = Array.from({ length: demand.length }, () => new Fraction(0));
                balancedCosts.push(dummyRow);
                balancedSupply.push(new Fraction(Math.abs(diff.num), diff.den));
            }
            else {
                // Дефіцит потреб -> Додаємо фіктивний стовпець (dummy consumer)
                balancedCosts.forEach(row => row.push(new Fraction(0)));
                balancedDemand.push(diff);
            }
        }
        return { balancedCosts, balancedSupply, balancedDemand };
    }
}
// ts/ResultRenderer.ts
class ResultRenderer {
    /**
     * Рендеринг кроків симплекс-методу (таблиці)
     */
    static render(history, container) {
        container.innerHTML = '';
        history.forEach((step, idx) => {
            const card = document.createElement('div');
            card.className = 'card step-card';
            let html = `<h3 style="margin-bottom: 1rem; color: #1e293b;">Крок №${idx}: ${step.description}</h3>`;
            html += `<div class="table-responsive"><table class="transport-table">`;
            html += `<thead><tr><th>Базис</th>`;
            const totalCols = step.matrix[0].length;
            for (let j = 1; j < totalCols; j++)
                html += `<th>x<sub>${j}</sub></th>`;
            html += `<th>B</th></tr></thead><tbody>`;
            step.matrix.forEach((row, i) => {
                const isZRow = i === step.matrix.length - 1;
                html += `<tr><td class="label-cell" style="background: #f8fafc; font-weight: bold;">
                    ${isZRow ? 'Z' : 'x' + (step.basis[i] + 1)}
                </td>`;
                row.forEach((cell, j) => {
                    const isPivotRow = (i === step.pivotRow);
                    const isPivotCol = (j === step.pivotCol);
                    const isIntersection = isPivotRow && isPivotCol;
                    let style = '';
                    if (isIntersection) {
                        style = 'background: #d1fae5; font-weight: bold; border: 2px solid #10b981; color: #065f46;';
                    }
                    else if (isPivotRow) {
                        style = 'background: #fff7ed; color: #9a3412;';
                    }
                    else if (isPivotCol) {
                        style = 'background: #eff6ff; color: #1e40af;';
                    }
                    html += `<td style="${style}">${this.formatFraction(cell)}</td>`;
                });
                html += `</tr>`;
            });
            html += `</tbody></table></div>`;
            card.innerHTML = html;
            container.appendChild(card);
        });
    }
    /**
     * Рендеринг графічного методу (Canvas)
     */
    /**
     * Рендеринг графічного методу (Canvas) з повним оформленням
     */
    static renderGraphical(result, container) {
        const canvasId = 'graph-canvas';
        container.innerHTML = `
        <div class="card step-card">
            <h3 style="margin-bottom: 1rem;">📈 Графічний розв'язок</h3>
            <div style="display: flex; justify-content: center; background: #fff; padding: 15px; border-radius: 8px;">
                <canvas id="${canvasId}" width="500" height="500" style="border: 1px solid #e2e8f0; max-width: 100%;"></canvas>
            </div>
            <div style="margin-top: 15px; padding: 15px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
                <p style="color: #166534;"><b>Оптимальна точка:</b> <span style="font-weight:700">(${result.best.x1.toFixed(2)}; ${result.best.x2.toFixed(2)})</span></p>
                <p style="color: #166534;"><b>Значення Z = </b> <span style="font-weight:700">${result.best.z.toFixed(2)}</span></p>
            </div>
        </div>`;
        const canvas = document.getElementById(canvasId);
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        const pad = 60;
        const maxX = Math.max(...result.points.map((p) => p.x), 5) * 1.2;
        const maxY = Math.max(...result.points.map((p) => p.y), 5) * 1.2;
        const toX = (x) => pad + (x * (canvas.width - pad * 2) / maxX);
        const toY = (y) => canvas.height - pad - (y * (canvas.height - pad * 2) / maxY);
        // 1. Сітка
        ctx.strokeStyle = '#f1f5f9';
        ctx.beginPath();
        for (let i = 0; i <= 10; i++) {
            const x = (maxX / 10) * i;
            const y = (maxY / 10) * i;
            ctx.moveTo(toX(x), toY(0));
            ctx.lineTo(toX(x), toY(maxY));
            ctx.moveTo(toX(0), toY(y));
            ctx.lineTo(toX(maxX), toY(y));
        }
        ctx.stroke();
        // 2. ОДР (Заливка)
        if (result.points.length > 2) {
            const cx = result.points.reduce((a, b) => a + b.x, 0) / result.points.length;
            const cy = result.points.reduce((a, b) => a + b.y, 0) / result.points.length;
            const sorted = [...result.points].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
            ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
            ctx.beginPath();
            ctx.moveTo(toX(sorted[0].x), toY(sorted[0].y));
            sorted.forEach(p => ctx.lineTo(toX(p.x), toY(p.y)));
            ctx.closePath();
            ctx.fill();
        }
        // 3. ЛІНІЇ ОБМЕЖЕНЬ ТА РІВНЯННЯ
        result.lines.forEach((l, i) => {
            const color = `hsl(${i * 137.5}, 65%, 45%)`;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (Math.abs(l.b) > 1e-9) {
                ctx.moveTo(toX(0), toY(l.c / l.b));
                ctx.lineTo(toX(maxX), toY((l.c - l.a * maxX) / l.b));
            }
            else {
                ctx.moveTo(toX(l.c / l.a), toY(0));
                ctx.lineTo(toX(l.c / l.a), toY(maxY));
            }
            ctx.stroke();
            // Підпис рівняння
            ctx.font = 'italic 11px Inter';
            let eq = `${l.a.toFixed(1)}x₁ ${l.b >= 0 ? '+' : ''} ${l.b.toFixed(1)}x₂ = ${l.c.toFixed(1)}`;
            const textW = ctx.measureText(eq).width;
            let lx = Math.abs(l.b) > 1e-9 ? toX(maxX * 0.6) : toX(l.c / l.a) + 5;
            let ly = Math.abs(l.b) > 1e-9 ? toY((l.c - l.a * maxX * 0.6) / l.b) - 5 : toY(maxY * 0.7);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(lx - 2, ly - 12, textW + 4, 14);
            ctx.fillStyle = color;
            ctx.fillText(eq, lx, ly);
        });
        // 4. ГРАДІЄНТ (Вектор Z)
        const [objC1, objC2] = result.objCoeffs;
        if (Math.abs(objC1) > 0.01 || Math.abs(objC2) > 0.01) {
            const sX = toX(0), sY = toY(0);
            const len = Math.sqrt(Math.pow(objC1, 2) + Math.pow(objC2, 2));
            const vX = toX((objC1 / len) * (maxX * 0.2)), vY = toY((objC2 / len) * (maxY * 0.2));
            ctx.strokeStyle = '#1e40af';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(sX, sY);
            ctx.lineTo(vX, vY);
            ctx.stroke();
            const ang = Math.atan2(vY - sY, vX - sX);
            ctx.fillStyle = '#1e40af';
            ctx.beginPath();
            ctx.moveTo(vX, vY);
            ctx.lineTo(vX - 12 * Math.cos(ang - 0.4), vY - 12 * Math.sin(ang - 0.4));
            ctx.lineTo(vX - 12 * Math.cos(ang + 0.4), vY - 12 * Math.sin(ang + 0.4));
            ctx.fill();
            ctx.fillText('grad Z', vX + 5, vY);
        }
        // 5. ЛІНІЯ РІВНЯ (Indigo пунктир)
        const curZ = result.best.z;
        ctx.setLineDash([8, 4]);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (Math.abs(objC2) > 1e-9) {
            ctx.moveTo(toX(0), toY(curZ / objC2));
            ctx.lineTo(toX(maxX), toY((curZ - objC1 * maxX) / objC2));
        }
        else {
            ctx.moveTo(toX(curZ / objC1), toY(0));
            ctx.lineTo(toX(curZ / objC1), toY(maxY));
        }
        ctx.stroke();
        ctx.setLineDash([]);
        // 6. ОСІ
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pad, 10);
        ctx.lineTo(pad, canvas.height - pad);
        ctx.lineTo(canvas.width - 10, canvas.height - pad);
        ctx.stroke();
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 14px Inter';
        ctx.fillText('x₂', pad - 25, 20);
        ctx.fillText('x₁', canvas.width - 20, canvas.height - pad + 25);
        // 7. ОПТИМАЛЬНА ТОЧКА
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(toX(result.best.x1), toY(result.best.x2), 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 13px Inter';
        ctx.fillText(`Opt (${result.best.x1.toFixed(2)}; ${result.best.x2.toFixed(2)})`, toX(result.best.x1) + 12, toY(result.best.x2) - 12);
    }
    /**
     * Рендеринг транспортної задачі
     */
    static renderTransport(history, costs, container) {
        container.innerHTML = '';
        history.forEach((step, idx) => {
            const card = document.createElement('div');
            card.className = 'card step-card';
            let html = `<h4>Крок №${idx}: ${step.description}</h4>`;
            html += `<div class="table-responsive"><table class="transport-table">`;
            html += `<thead><tr><th>A \\ B</th>`;
            for (let j = 0; j < step.matrix[0].length; j++)
                html += `<th>B${j + 1}</th>`;
            html += `</tr></thead><tbody>`;
            step.matrix.forEach((row, i) => {
                html += `<tr><td class="label-cell">A${i + 1}</td>`;
                row.forEach((cell, j) => {
                    const isPivot = (i === step.pivotRow && j === step.pivotCol);
                    const cost = costs[i] && costs[i][j] ? costs[i][j].toString() : "0";
                    html += `
                    <td class="transport-cell" style="${isPivot ? 'background: #ecfdf5; border: 2px solid #10b981;' : ''}">
                        <div class="cell-combined">
                            <div class="cell-cost">${cost}</div>
                            <div class="cell-qty">${cell.isZero() ? '' : this.formatFraction(cell)}</div>
                        </div>
                    </td>`;
                });
                html += `</tr>`;
            });
            html += `</tbody></table></div>`;
            card.innerHTML = html;
            container.appendChild(card);
        });
    }
    static formatFraction(f) {
        if (f.den === 1)
            return f.num.toString();
        return `<span class="fraction"><span class="numerator">${f.num}</span><span class="denominator">${f.den}</span></span>`;
    }
}
// ts/AppController.ts
class AppController {
    constructor() {
        this.currentMethod = 'simplex';
        this.solvers = {
            'simplex': new SimplexSolver(),
            'dual': new DualSimplexSolver(),
            'transport': new TransportationSolver(),
            'gomory': new GomorySolver(),
            'big-m': new ArtificialBasisSolver(),
            'graphic': new GraphicalSolver()
        };
        this.navItems = document.querySelectorAll('#nav-menu li');
        this.simplexWS = document.getElementById('workspace-simplex');
        this.transportWS = document.getElementById('workspace-transport');
        this.simplexControls = document.getElementById('simplex-controls');
        this.transportControls = document.getElementById('transport-controls');
        this.viewTitle = document.getElementById('view-title');
        this.inputN = document.getElementById('input-n');
        this.inputM = document.getElementById('input-m');
        this.inputTM = document.getElementById('input-tm');
        this.inputTN = document.getElementById('input-tn');
        this.init();
    }
    init() {
        var _a;
        this.navItems.forEach(item => {
            item.addEventListener('click', () => this.switchMethod(item));
        });
        [this.inputN, this.inputM, this.inputTM, this.inputTN].forEach(input => {
            input === null || input === void 0 ? void 0 : input.addEventListener('input', () => {
                if (this.currentMethod === 'transport') {
                    this.renderTransportMatrix();
                }
                else {
                    this.renderSimplexMatrix();
                }
            });
        });
        (_a = document.getElementById('solve-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => this.handleSolve());
        this.renderSimplexMatrix();
    }
    handleSolve() {
        const outputEl = document.getElementById('solution-output');
        const statusEl = document.getElementById('validation-status');
        try {
            if (statusEl) {
                statusEl.innerText = "⏳ Обчислення...";
                statusEl.style.color = "#334155";
            }
            const solver = this.solvers[this.currentMethod];
            if (!solver)
                throw new Error(`Метод ${this.currentMethod} не знайдено.`);
            const data = (this.currentMethod === 'transport')
                ? this.collectTransportData()
                : this.collectSimplexData();
            const result = solver.solve(data);
            if (outputEl) {
                outputEl.innerHTML = '';
                if (this.currentMethod === 'transport') {
                    ResultRenderer.renderTransport(result, data.costs, outputEl);
                }
                else if (this.currentMethod === 'graphic') {
                    ResultRenderer.renderGraphical(result, outputEl);
                }
                else {
                    ResultRenderer.render(result, outputEl);
                }
            }
            if (statusEl) {
                statusEl.innerText = "✓ Розв'язок знайдено";
                statusEl.style.color = "#059669";
            }
        }
        catch (e) {
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
    collectSimplexData() {
        var _a, _b, _c;
        const n = parseInt(((_a = this.inputN) === null || _a === void 0 ? void 0 : _a.value) || "0");
        const m = parseInt(((_b = this.inputM) === null || _b === void 0 ? void 0 : _b.value) || "0");
        const target = ((_c = document.getElementById('target-type')) === null || _c === void 0 ? void 0 : _c.value) || "max";
        const objective = Array.from(document.querySelectorAll('.obj-val'))
            .slice(0, n)
            .map((el) => Fraction.fromString(el.value || "0"));
        const constraints = Array.from(document.querySelectorAll('#constraints-container .matrix-row'))
            .map((row) => ({
            coeffs: Array.from(row.querySelectorAll('.constr-val'))
                .map((el) => Fraction.fromString(el.value || "0")),
            rhs: Fraction.fromString(row.querySelector('.rhs-val').value || "0"),
            sign: row.querySelector('.sign-select').value
        }));
        return { n, m, objective, constraints, target };
    }
    collectTransportData() {
        var _a, _b;
        const m = parseInt(((_a = this.inputTM) === null || _a === void 0 ? void 0 : _a.value) || "2");
        const n = parseInt(((_b = this.inputTN) === null || _b === void 0 ? void 0 : _b.value) || "2");
        const costs = [];
        const supply = [];
        const demand = [];
        const rows = document.querySelectorAll('#transport-table-container tbody tr');
        rows.forEach((row, i) => {
            if (i < m) {
                const rowCosts = Array.from(row.querySelectorAll('.cell-cost'))
                    .map((el) => Fraction.fromString(el.value || "0"));
                costs.push(rowCosts);
                const sInput = row.querySelector('.stock-cell .input-main');
                supply.push(Fraction.fromString((sInput === null || sInput === void 0 ? void 0 : sInput.value) || "0"));
            }
            else if (i === m) {
                const dInputs = row.querySelectorAll('.demand-cell .input-main');
                dInputs.forEach((input) => {
                    demand.push(Fraction.fromString(input.value || "0"));
                });
            }
        });
        return { costs, supply, demand };
    }
    switchMethod(element) {
        this.navItems.forEach(i => i.classList.remove('active'));
        element.classList.add('active');
        this.currentMethod = element.getAttribute('data-method') || 'simplex';
        if (this.viewTitle)
            this.viewTitle.innerText = element.innerText;
        const outputEl = document.getElementById('solution-output');
        if (outputEl)
            outputEl.innerHTML = '<p>Введіть умови та натисніть "Розв\'язати"</p>';
        const isTransport = this.currentMethod === 'transport';
        const isMatrixEditor = ['simplex', 'dual', 'gomory', 'big-m', 'graphic'].includes(this.currentMethod);
        if (this.currentMethod === 'graphic') {
            if (this.inputN) {
                this.inputN.value = "2";
                this.inputN.disabled = true;
            }
        }
        else {
            if (this.inputN)
                this.inputN.disabled = false;
        }
        this.setElementsDisplay(isMatrixEditor ? 'block' : 'none', isTransport ? 'block' : 'none');
        if (isTransport) {
            this.renderTransportMatrix();
        }
        else if (isMatrixEditor) {
            this.renderSimplexMatrix();
        }
    }
    setElementsDisplay(simplexDisp, transportDisp) {
        [this.simplexWS, this.simplexControls].forEach(el => el && (el.style.display = simplexDisp));
        [this.transportWS, this.transportControls].forEach(el => el && (el.style.display = transportDisp));
    }
    renderSimplexMatrix() {
        if (!this.inputN || !this.inputM)
            return;
        const n = parseInt(this.inputN.value) || 1;
        const m = parseInt(this.inputM.value) || 1;
        const objCont = document.getElementById('objective-func-container');
        const constrCont = document.getElementById('constraints-container');
        if (!objCont || !constrCont)
            return;
        objCont.innerHTML = '<strong>F(x) = </strong>' + Array.from({ length: n }, (_, j) => `<input type="text" class="obj-val" placeholder="0"> <span>x<sub>${j + 1}</sub></span>`).join(' + ');
        constrCont.innerHTML = Array.from({ length: m }, (_, i) => `
            <div class="matrix-row">
                ${Array.from({ length: n }, (_, j) => `<input type="text" class="constr-val" placeholder="0"> <span>x<sub>${j + 1}</sub></span>`).join(' + ')} 
                <select class="sign-select">
                    <option value="le">≤</option>
                    <option value="ge">≥</option>
                    <option value="eq">=</option>
                </select> 
                <input type="text" class="rhs-val" placeholder="0">
            </div>
        `).join('');
    }
    renderTransportMatrix() {
        if (!this.inputTM || !this.inputTN)
            return;
        const m = parseInt(this.inputTM.value) || 2;
        const n = parseInt(this.inputTN.value) || 2;
        const container = document.getElementById('transport-table-container');
        if (!container)
            return;
        let html = `<thead><tr><th>A \\ B</th>${Array.from({ length: n }, (_, j) => `<th>B${j + 1}</th>`).join('')}<th>Запаси</th></tr></thead><tbody>`;
        html += Array.from({ length: m }, (_, i) => `
            <tr>
                <td class="label-cell">A${i + 1}</td>
                ${Array.from({ length: n }, () => `
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
            ${Array.from({ length: n }, () => `<td class="demand-cell"><input type="text" class="input-main" placeholder="bj"></td>`).join('')}
            <td>Σ</td></tr></tbody>`;
        container.innerHTML = html;
    }
} // <--- Закриває клас AppController
document.addEventListener('DOMContentLoaded', () => {
    console.log("🟢 DOM завантажено. Запускаємо AppController...");
    new AppController();
});
