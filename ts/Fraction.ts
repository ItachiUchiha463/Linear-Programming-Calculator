export class Fraction {
    constructor(public num: number, public den: number = 1) {
        this.simplify();
    }

    private simplify(): void {
        if (this.den === 0) throw new Error("Знаменник не може бути нулем");
        if (this.den < 0) { this.num *= -1; this.den *= -1; }
        const common = this.gcd(Math.abs(this.num), Math.abs(this.den));
        this.num /= common;
        this.den /= common;
    }

    private gcd(a: number, b: number): number {
        return b === 0 ? a : this.gcd(b, a % b);
    }

    static fromString(str: string): Fraction {
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
    public getFractionalPart(): Fraction {
        // Математична дробова частина: {x} = x - floor(x)
        let val = this.num / this.den;
        let floorVal = Math.floor(val);

        // Результат: f = x - floorVal
        // (num/den) - floorVal = (num - floorVal * den) / den
        return new Fraction(this.num - floorVal * this.den, this.den);
    }
    add(f: Fraction): Fraction { return new Fraction(this.num * f.den + f.num * this.den, this.den * f.den); }
    sub(f: Fraction): Fraction { return new Fraction(this.num * f.den - f.num * this.den, this.den * f.den); }
    mul(f: Fraction): Fraction { return new Fraction(this.num * f.num, this.den * f.den); }
    div(f: Fraction): Fraction { return new Fraction(this.num * f.den, this.den * f.num); }

    isNegative(): boolean { return this.num < 0; }
    isZero(): boolean { return this.num === 0; }
    toString(): string { return this.den === 1 ? `${this.num}` : `${this.num}/${this.den}`; }
}
