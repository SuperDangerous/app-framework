import { vi } from 'vitest';

// Provide requireActual/requireMock aliases for legacy Jest-style mocks
(vi as any).requireActual = vi.importActual;
(vi as any).requireMock = vi.importMock;

// Alias global jest to vi for legacy compatibility
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.jest = Object.assign(vi, {
  requireActual: vi.importActual,
  requireMock: vi.importMock,
});
