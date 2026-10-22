import { Mock, vi } from "vitest";

// Vitest 5 hoists vi.mock and rejects calls nested in functions. The factories
// close over these handles, which have to exist before that hoist runs.
const mocks = vi.hoisted(() => {
  const fn = () => vi.fn<(...args: unknown[]) => unknown>();
  return {
    messageCommand: fn(),
    statusCommand: fn(),
    configureCommand: fn(),
    configureCommandWithSections: fn(),
    setupCommand: fn(),
    onboardCommand: fn(),
    callGateway: fn(),
    runChannelLogin: fn(),
    runChannelLogout: fn(),
    runTui: fn(),
    loadAndMaybeMigrateDoctorConfig: fn(),
    ensureConfigReady: fn(),
    ensurePluginRegistryLoaded: fn(),
    runtime: {
      log: vi.fn<(...args: unknown[]) => void>(),
      error: vi.fn<(...args: unknown[]) => void>(),
      exit: vi.fn<(...args: unknown[]) => never>(() => {
        throw new Error("exit");
      }),
    },
  };
});

export const messageCommand: Mock<(...args: unknown[]) => unknown> = mocks.messageCommand;
export const statusCommand: Mock<(...args: unknown[]) => unknown> = mocks.statusCommand;
export const configureCommand: Mock<(...args: unknown[]) => unknown> = mocks.configureCommand;
export const configureCommandWithSections: Mock<(...args: unknown[]) => unknown> =
  mocks.configureCommandWithSections;
export const setupCommand: Mock<(...args: unknown[]) => unknown> = mocks.setupCommand;
export const onboardCommand: Mock<(...args: unknown[]) => unknown> = mocks.onboardCommand;
export const callGateway: Mock<(...args: unknown[]) => unknown> = mocks.callGateway;
export const runChannelLogin: Mock<(...args: unknown[]) => unknown> = mocks.runChannelLogin;
export const runChannelLogout: Mock<(...args: unknown[]) => unknown> = mocks.runChannelLogout;
export const runTui: Mock<(...args: unknown[]) => unknown> = mocks.runTui;

export const loadAndMaybeMigrateDoctorConfig: Mock<(...args: unknown[]) => unknown> =
  mocks.loadAndMaybeMigrateDoctorConfig;
export const ensureConfigReady: Mock<(...args: unknown[]) => unknown> = mocks.ensureConfigReady;
export const ensurePluginRegistryLoaded: Mock<(...args: unknown[]) => unknown> =
  mocks.ensurePluginRegistryLoaded;

export const runtime: {
  log: Mock<(...args: unknown[]) => void>;
  error: Mock<(...args: unknown[]) => void>;
  exit: Mock<(...args: unknown[]) => never>;
} = mocks.runtime;

vi.mock("../commands/message.js", () => ({ messageCommand: mocks.messageCommand }));
vi.mock("../commands/status.js", () => ({ statusCommand: mocks.statusCommand }));
vi.mock("../commands/configure.js", () => ({
  CONFIGURE_WIZARD_SECTIONS: [
    "workspace",
    "model",
    "web",
    "gateway",
    "daemon",
    "channels",
    "skills",
    "health",
  ],
  configureCommand: mocks.configureCommand,
  configureCommandWithSections: mocks.configureCommandWithSections,
  configureCommandFromSectionsArg: (sections: unknown, runtimeArg: unknown) => {
    const resolved = Array.isArray(sections) ? sections : [];
    if (resolved.length > 0) {
      return mocks.configureCommandWithSections(resolved, runtimeArg);
    }
    return mocks.configureCommand({}, runtimeArg);
  },
}));
vi.mock("../commands/setup.js", () => ({ setupCommand: mocks.setupCommand }));
vi.mock("../commands/onboard.js", () => ({ onboardCommand: mocks.onboardCommand }));
vi.mock("../runtime.js", () => ({ defaultRuntime: mocks.runtime }));
vi.mock("./channel-auth.js", () => ({
  runChannelLogin: mocks.runChannelLogin,
  runChannelLogout: mocks.runChannelLogout,
}));
vi.mock("../tui/tui.js", () => ({ runTui: mocks.runTui }));
vi.mock("../gateway/call.js", () => ({
  callGateway: mocks.callGateway,
  randomIdempotencyKey: () => "idem-test",
  buildGatewayConnectionDetails: () => ({
    url: "ws://127.0.0.1:1234",
    urlSource: "test",
    message: "Gateway target: ws://127.0.0.1:1234",
  }),
}));
vi.mock("./deps.js", () => ({ createDefaultDeps: () => ({}) }));

// Kept so existing suites still call the same setup helpers. The mocks above
// are applied when this module loads.
export function installBaseProgramMocks() {}

export function installSmokeProgramMocks() {}
