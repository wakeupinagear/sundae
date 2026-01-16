// Source - https://stackoverflow.com/a
// Posted by bryc, modified by community. See post 'Timeline' for change history
// Retrieved 2026-01-11, License - CC BY-SA 4.0

// splitmix32
export function generatePRNG(a: number) {
    return function () {
        a |= 0;
        a = (a + 0x9e3779b9) | 0;
        let t = a ^ (a >>> 16);
        t = Math.imul(t, 0x21f0aaad);
        t = t ^ (t >>> 15);
        t = Math.imul(t, 0x735a2d97);
        t = t ^ (t >>> 15);

        const result = (t >>> 0) / 4294967296;

        return result;
    };
}
