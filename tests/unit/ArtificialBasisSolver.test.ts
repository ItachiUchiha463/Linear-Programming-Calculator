import { ArtificialBasisSolver } from '../../ts/ArtificialBasisSolver';
import { Fraction } from '../../ts/Fraction';

describe('ArtificialBasisSolver Unit Tests', () => {
    const solver = new ArtificialBasisSolver();

    test('should solve problem with equality and ge constraints', () => {
        const data = {
            n: 2, m: 2, target: 'min',
            objective: [new Fraction(4), new Fraction(1)],
            constraints: [
                { coeffs: [new Fraction(3), new Fraction(1)], sign: 'eq', rhs: new Fraction(3) },
                { coeffs: [new Fraction(4), new Fraction(3)], sign: 'ge', rhs: new Fraction(6) }
            ]
        };
        const history = solver.solve(data);
        expect(history[history.length - 1].description).toContain('Оптимально');
    });

    test('should throw error for infeasible problem', () => {
        const data = {
            n: 1, m: 2, target: 'max', objective: [new Fraction(1)],
            constraints: [
                { coeffs: [new Fraction(1)], sign: 'le', rhs: new Fraction(2) },
                { coeffs: [new Fraction(1)], sign: 'ge', rhs: new Fraction(5) }
            ]
        };
        expect(() => solver.solve(data)).toThrow("Задача не має допустимих розв'язків");
    });

    test('should handle mixed constraints (le, ge, eq) correctly', () => {
        const data = {
            n: 2, m: 3, target: 'max',
            objective: [new Fraction(2), new Fraction(3)],
            constraints: [
                { coeffs: [new Fraction(1), new Fraction(0)], sign: 'le', rhs: new Fraction(4) },
                { coeffs: [new Fraction(0), new Fraction(2)], sign: 'ge', rhs: new Fraction(2) },
                { coeffs: [new Fraction(3), new Fraction(2)], sign: 'eq', rhs: new Fraction(18) }
            ]
        };
        const history = solver.solve(data);
        expect(history[history.length - 1].description).toContain('Оптимально');
    });
});