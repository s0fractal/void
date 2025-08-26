// Test file with various pure functions for Chimera extraction

export function add(a: number, b: number): number {
    return a + b;
}

export function multiply(a: number, b: number): number {
    return a * b;
}

export function compose<A, B, C>(f: (b: B) => C, g: (a: A) => B): (a: A) => C {
    return (a: A) => f(g(a));
}

export function identity<T>(x: T): T {
    return x;
}

export function constant<T>(x: T): () => T {
    return () => x;
}

export function flip<A, B, C>(f: (a: A) => (b: B) => C): (b: B) => (a: A) => C {
    return (b: B) => (a: A) => f(a)(b);
}

export function pipe<A, B>(a: A, f: (a: A) => B): B {
    return f(a);
}

// Impure functions (should NOT be extracted)
export function impureRandom(): number {
    return Math.random();
}

export function impureLog(msg: string): void {
    console.log(msg);
}

export async function impureAsync(): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return 42;
}

// More pure functions
export function factorial(n: number): number {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

export function fibonacci(n: number): number {
    return n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2);
}

export function curry<A, B, C>(f: (a: A, b: B) => C): (a: A) => (b: B) => C {
    return (a: A) => (b: B) => f(a, b);
}

export function map<A, B>(f: (a: A) => B): (as: A[]) => B[] {
    return (as: A[]) => as.map(f);
}

export function filter<A>(pred: (a: A) => boolean): (as: A[]) => A[] {
    return (as: A[]) => as.filter(pred);
}

export function reduce<A, B>(f: (acc: B, a: A) => B, init: B): (as: A[]) => B {
    return (as: A[]) => as.reduce(f, init);
}