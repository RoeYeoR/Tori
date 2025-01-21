// Mock Firebase modules
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    createUserWithEmailAndPassword: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
  })),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    collection: jest.fn(),
    doc: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    where: jest.fn(),
    batch: jest.fn(),
    FieldValue: {
      serverTimestamp: jest.fn(),
    },
    Timestamp: {
      fromDate: jest.fn(date => date),
    },
  })),
}));
