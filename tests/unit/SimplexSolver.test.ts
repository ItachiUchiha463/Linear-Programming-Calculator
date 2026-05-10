import { SimplexSolver } from '../../ts/SimplexSolver';
import { Fraction } from '../../ts/Fraction';

describe('SimplexSolver Integration Tests', () => {
    const solver = new SimplexSolver();

    test('should find optimal solution for standard LPP', () => {
        const data = {
            n: 2, m: 2, target: 'max',
            objective: [new Fraction(3), new Fraction(2)],
            constraints: [
                {coeffs: [new Fraction(2), new Fraction(1)], sign: 'le', rhs: new Fraction(18)},
                {coeffs: [new Fraction(2), new Fraction(3)], sign: 'le', rhs: new Fraction(42)}
            ]
        };
        const history = solver.solve(data);
        expect(history[history.length - 1].description).toContain('Оптимально');
    });

    test('should throw error for unbounded solution', () => {
        const data = {
            n: 1, m: 1, target: 'max',
            objective: [new Fraction(1)],
            constraints: [
                {coeffs: [new Fraction(-1)], sign: 'le', rhs: new Fraction(10)} // x1 >= -10, max x1 -> inf
            ]
        };
        expect(() => solver.solve(data)).toThrow("Цільова функція не обмежена");
    });

    test('should solve with zero RHS (degenerate case)', () => {
        const data = {
            n: 2, m: 1, target: 'max',
            objective: [new Fraction(1), new Fraction(1)],
            constraints: [
                {coeffs: [new Fraction(1), new Fraction(1)], sign: 'le', rhs: new Fraction(0)}
            ]
        };
        const history = solver.solve(data);
        const lastMatrix = history[history.length - 1].matrix;
        // Перевіряємо саме значення B (останній стовпець), воно має бути 0
        const bValue = lastMatrix[0][lastMatrix[0].length - 1];
        expect(bValue.isZero()).toBe(true);
    });
});