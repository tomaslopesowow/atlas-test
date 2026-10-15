const ROMAN_NUMERAL_MAP: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
];

export const formatRomanNumber = (number: number) => {
    let result = '';

    for (const [value, numeral] of ROMAN_NUMERAL_MAP) {
        while (number >= value) {
            result += numeral;
            number -= value;
        }
    }
    return result;
};
