import {Fraction} from './Fraction';
import {Tableau} from "./Interfaces";
import {ISolverStrategy} from "./Interfaces";

export class TransportationSolver implements ISolverStrategy {
    // Вхідний параметр тепер один — 'data', щоб відповідати ISolverStrategy
    public solve(data: any): Tableau[] {
        const { costs, supply, demand } = data;

        if (!costs || !supply || !demand) {
            throw new Error("Транспортна задача: Відсутні вхідні дані (тарифи, запаси або потреби)");
        }

        const history: Tableau[] = [];

        // 1. Балансування задачі
        // Умова закритої моделі: \sum_{i=1}^{m} a_i = \sum_{j=1}^{n} b_j
        let { balancedCosts, balancedSupply, balancedDemand } = this.balanceTask(costs, supply, demand);

        const m = balancedSupply.length;
        const n = balancedDemand.length;

        let shipments: Fraction[][] = Array.from({ length: m }, () =>
            Array.from({ length: n }, () => new Fraction(0))
        );

        let currentSupply = [...balancedSupply];
        let currentDemand = [...balancedDemand];

        history.push({
            matrix: this.cloneMatrix(shipments),
            basis: [],
            description: "Початковий стан: Задача збалансована. Починаємо розподіл методом мінімальної вартості."
        });

        // 2. Основний цикл методу мінімальної вартості
        while (true) {
            let minCost: Fraction | null = null;
            let targetCell: { r: number, c: number } | null = null;

            for (let i = 0; i < m; i++) {
                if (currentSupply[i].isZero()) continue;
                for (let j = 0; j < n; j++) {
                    if (currentDemand[j].isZero()) continue;

                    const cost = balancedCosts[i][j];
                    if (minCost === null || cost.sub(minCost).isNegative()) {
                        minCost = cost;
                        targetCell = { r: i, c: j };
                    }
                }
            }

            if (!targetCell) break;

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
                description: `Призначено ${val.toString()} од. у комірку A${r+1}-B${c+1} (min тариф: ${balancedCosts[r][c].toString()})`
            });
        }

        return history;
    }

    private balanceTask(costs: Fraction[][], supply: Fraction[], demand: Fraction[]) {
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
            } else {
                // Дефіцит потреб -> Додаємо фіктивний стовпець (dummy consumer)
                balancedCosts.forEach(row => row.push(new Fraction(0)));
                balancedDemand.push(diff);
            }
        }

        return { balancedCosts, balancedSupply, balancedDemand };
    }

    private cloneMatrix = (m: Fraction[][]) => m.map(row => [...row]);
}