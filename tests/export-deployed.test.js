/**
 * @jest-environment-options {"url": "https://library-demo.vercel.app/"}
 */
import { jest } from '@jest/globals';
import * as uiModule from '../public/src/ui.js';

describe('exportLibraryData on the deployed site', () => {
    test('does not call /save when the hostname is not localhost', async () => {
        global.fetch = jest.fn(() => Promise.resolve({ ok: true }));

        await uiModule.exportLibraryData();

        expect(window.location.hostname).toBe('library-demo.vercel.app');
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
