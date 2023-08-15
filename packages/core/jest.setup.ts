// @ts-nocheck
import * as util from "util";

Object.defineProperty(window, "TextEncoder", {
  writable: true,
  value: util.TextEncoder,
});
Object.defineProperty(window, "TextDecoder", {
  writable: true,
  value: util.TextDecoder,
});

global.console = {
  ...global.console,
  info: jest.fn(),
};
