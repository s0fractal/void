// Test file with semantically identical functions written differently
// These should have the SAME protein hash despite different syntax

// Version A: Traditional function
export function addA(a: number, b: number): number {
    return a + b;
}

// Version B: Arrow function with different names
export const sumB = (x: number, y: number): number => {
    // This is addition
    return x + y;
};

// Version C: Verbose with temporary variable
export function additionC(first: number, second: number): number {
    const result = first + second;
    return result;
}

// Version D: One-liner arrow
export const plusD = (p: number, q: number): number => p + q;

// Different function: multiplication (should have DIFFERENT protein hash)
export function multiply(a: number, b: number): number {
    return a * b;
}

// Another different function: subtraction
export function subtract(a: number, b: number): number {
    return a - b;
}

// Complex example: factorial (recursive)
export function factorialA(n: number): number {
    if (n <= 1) return 1;
    return n * factorialA(n - 1);
}

// Same factorial, different style
export const factorialB = (num: number): number => {
    return num <= 1 ? 1 : num * factorialB(num - 1);
};

// Iterative factorial (different algorithm, different protein hash)
export function factorialIterative(n: number): number {
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}