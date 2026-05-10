import { Fraction } from '../../ts/Fraction';

describe('Fraction Class Unit Tests', () => {
    test('should simplify 10/20 to 1/2', () => {
        const f = new Fraction(10, 20);
        expect(f.toString()).toBe('1/2');
    });

    test('should multiply fractions correctly (2/3 * 3/4 = 1/2)', () => {
        const f1 = new Fraction(2, 3);
        const f2 = new Fraction(3, 4);
        expect(f1.mul(f2).toString()).toBe('1/2');
    });

    test('should parse string "0.75" to 3/4', () => {
        const f = Fraction.fromString("0.75");
        expect(f.num).toBe(3);
        expect(f.den).toBe(4);
    });
});