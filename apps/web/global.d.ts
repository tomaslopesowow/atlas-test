export {};

declare global {
    // biome-ignore lint/suspicious/noExplicitAny: gtag should accept any arguments
    function gtag(...args: any[]): void;
}
