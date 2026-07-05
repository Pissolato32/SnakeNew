import { hslToRgb } from './Utils.js';

describe('Utils', () => {
    describe('hslToRgb', () => {
        it('should convert HSL to RGB correctly', () => {
            const rgb = hslToRgb(0, 100, 50);
            expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
        });

        it('should convert green HSL to RGB correctly', () => {
            const rgb = hslToRgb(120, 100, 50);
            expect(rgb).toEqual({ r: 0, g: 255, b: 0 });
        });

        it('should convert blue HSL to RGB correctly', () => {
            const rgb = hslToRgb(240, 100, 50);
            expect(rgb).toEqual({ r: 0, g: 0, b: 255 });
        });
    });
});
