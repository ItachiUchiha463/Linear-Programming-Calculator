/// <reference path="Interfaces.ts" />
import {ISolverStrategy} from "./Interfaces";

export class GraphicalSolver implements ISolverStrategy {
    public solve(data: any): any {
        if (data.n > 2) {
            throw new Error("Графічний метод працює тільки для 2 змінних (x₁ та x₂).");
        }

        const lines = data.constraints.map((c: any) => ({
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

    private getAllIntersections(lines: any[]): {x: number, y: number}[] {
        const pts: {x: number, y: number}[] = [{x: 0, y: 0}];

        // Перетини з осями
        lines.forEach(l => {
            if (Math.abs(l.a) > 1e-9) pts.push({x: l.c / l.a, y: 0});
            if (Math.abs(l.b) > 1e-9) pts.push({x: 0, y: l.c / l.b});
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

    private isFeasible(p: {x: number, y: number}, lines: any[]): boolean {
        return lines.every(l => {
            const val = l.a * p.x + l.b * p.y;
            if (l.sign === 'le') return val <= l.c + 1e-7;
            if (l.sign === 'ge') return val >= l.c - 1e-7;
            return Math.abs(val - l.c) < 1e-7;
        });
    }
}