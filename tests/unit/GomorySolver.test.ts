import { GomorySolver } from '../../ts/GomorySolver';
import { Fraction } from '../../ts/Fraction';

describe('GomorySolver Integer Tests', () => {
    const solver = new GomorySolver();

    test('should return integer solutions after cuts', () => {
        const data = {
            n: 2, m: 2, target: 'max',
            objective: [new Fraction(1), new Fraction(1)],
            constraints: [
                { coeffs: [new Fraction(2), new Fraction(1)], sign: 'le', rhs: new Fraction(6) },
                { coeffs: [new Fraction(2), new Fraction(5)], sign: 'le', rhs: new Fraction(15) }
            ]
        };
        const history = solver.solve(data);
        expect(history[history.length - 1].description).toContain('цілочисельний');
    });

    test('should finish immediately if solution is already integer', () => {
        const data = {
            n: 2, m: 2, target: 'max',
            objective: [new Fraction(10), new Fraction(10)],
            constraints: [
                { coeffs: [new Fraction(1), new Fraction(0)], sign: 'le', rhs: new Fraction(5) },
                { coeffs: [new Fraction(0), new Fraction(1)], sign: 'le', rhs: new Fraction(5) }
            ]
        };
        const history = solver.solve(data);
        // Не повинно бути описів про "Додано січення", бо x=5, y=5 вже цілі
        const cutsAdded = history.some(h => h.description.includes('січення'));
        expect(cutsAdded).toBe(false);
    });

    test('should throw error if no integer solution exists', () => {
        const data = {
            n: 1, m: 2, target: 'max',
            objective: [new Fraction(1)],
            constraints: [
                // x >= 0.4 і x <= 0.6. Цілих чисел між ними немає.
                { coeffs: [new Fraction(1)], sign: 'ge', rhs: new Fraction(4, 10) },
                { coeffs: [new Fraction(1)], sign: 'le', rhs: new Fraction(6, 10) }
            ]
        };
        // Переконуємося, що солвер розпізнає відсутність цілих розв'язків
        expect(() => solver.solve(data)).toThrow();
    });
});