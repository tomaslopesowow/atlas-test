export type RecursiveNonNullable<T> = T extends null | undefined
    ? never
    : T extends object
      ? { [K in keyof T]: RecursiveNonNullable<T[K]> }
      : T;
