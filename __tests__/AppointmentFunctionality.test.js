/**
 * Test Suite: Appointment Functionality
 * 
 * This test suite verifies the core functionality of the appointment management system.
 * It tests three main features:
 * 1. Finding available appointment slots
 * 2. Booking new appointments
 * 3. Appointment cancellation by customers (self-service cancellation)
 *    Note: Business owners have separate functionality for managing appointments,
 *    which is tested in the BusinessFunctionality test suite.
 * 
 * The tests use mock implementations of Firebase Auth and Firestore to simulate
 * the database interactions without requiring a real Firebase connection.
 */

// Mock Firestore Collection Structure:
// - appointments/
//   - {appointmentId}/
//     - businessId: string
//     - customerId: string
//     - serviceId: string
//     - startTime: Timestamp
//     - endTime: Timestamp
//     - status: 'confirmed' | 'cancelled'
// - businesses/
//   - {businessId}/
//     - availableSlots/
//       - {date}/
//         - slots: Array<{ time: string, available: boolean }>

const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({
            exists: true,
            data: () => ({
              slots: [
                { time: '09:00', available: true },
                { time: '09:15', available: true },
                { time: '09:30', available: true },
                { time: '09:45', available: false }
              ]
            }),
            id: 'mock-doc-id'
          })),
          set: jest.fn(() => Promise.resolve()),
          update: jest.fn(() => Promise.resolve()),
          id: 'mock-doc-id'
        }))
      })),
      get: jest.fn(() => Promise.resolve({
        exists: true,
        data: () => ({
          slots: [
            { time: '09:00', available: true },
            { time: '09:15', available: true }
          ]
        }),
        id: 'mock-doc-id'
      })),
      set: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => Promise.resolve()),
      id: 'mock-doc-id'
    })),
    where: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ docs: [] }))
    }))
  }))
};

// Mock batch operations for atomic updates
const mockBatch = {
  set: jest.fn(),
  update: jest.fn(),
  commit: jest.fn(() => Promise.resolve())
};

// Mock Firebase Auth to simulate authenticated user
jest.mock('@react-native-firebase/auth', () => {
  return {
    __esModule: true,
    default: jest.fn(() => ({
      currentUser: { uid: 'test-user-id' }
    }))
  };
});

// Mock Firebase Firestore with both instance and static methods
jest.mock('@react-native-firebase/firestore', () => {
  const mockFirestoreInstance = jest.fn(() => ({
    collection: mockFirestore.collection,
    batch: jest.fn(() => mockBatch)
  }));

  // Add static properties
  mockFirestoreInstance.Timestamp = {
    fromDate: jest.fn(date => ({ 
      toDate: () => date,
      toMillis: () => date.getTime()
    }))
  };
  mockFirestoreInstance.FieldValue = {
    serverTimestamp: jest.fn(() => 'timestamp')
  };

  return {
    __esModule: true,
    default: mockFirestoreInstance
  };
});

// Mock React Native Alert for error handling
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn()
  }
}));

// Import the appointment utility functions to test
const { findAvailableSlots, bookAppointment, cancelAppointment } = require('../src/utils/appointmentUtils');

describe('Appointment Module', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Reset all mock function calls before each test
  });

  describe('findAvailableSlots', () => {
    const validBusinessId = 'test-business-id';
    const validDate = '2025-01-21';
    const validServiceDuration = 30;

    /**
     * Test: Empty Array for Missing Business ID
     * Target: Verify that the function handles missing businessId gracefully
     * Expected: Return empty array instead of throwing error
     */
    it('should return empty array if businessId is not provided', async () => {
      const result = await findAvailableSlots(null, validDate, validServiceDuration);
      expect(result).toEqual([]);
    });

    /**
     * Test: Valid Slot Search
     * Target: Verify that the function returns available slots for valid inputs
     * Expected: Return array of available time slots
     */
    it('should return available slots for valid inputs', async () => {
      const result = await findAvailableSlots(validBusinessId, validDate, validServiceDuration);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    /**
     * Test: Invalid Slot Data Handling
     * Target: Verify that the function handles corrupted slot data gracefully
     * Expected: Return empty array instead of throwing error
     */
    it('should handle invalid slot data', async () => {
      mockFirestore.collection().doc().collection().doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ slots: null })
      });

      const result = await findAvailableSlots(validBusinessId, validDate, validServiceDuration);
      expect(result).toEqual([]);
    });
  });

  describe('bookAppointment', () => {
    const mockAppointmentData = {
      businessId: 'test-business-id',
      customerId: 'test-user-id',
      serviceId: 'test-service-id',
      date: '2025-01-21',
      startTime: new Date('2025-01-21T09:00:00'),
      slotIndexes: [0, 1],
      serviceDuration: 30,
      serviceDetails: { 
        name: 'Test Service',
        price: 100
      }
    };

    /**
     * Test: Successful Appointment Booking
     * Target: Verify that appointments can be booked with valid data
     * Expected: Return success object with appointment ID
     */
    it('should successfully book an appointment with valid data', async () => {
      const result = await bookAppointment(
        mockAppointmentData.businessId,
        mockAppointmentData.customerId,
        mockAppointmentData.serviceId,
        mockAppointmentData.date,
        mockAppointmentData.startTime,
        mockAppointmentData.slotIndexes,
        mockAppointmentData.serviceDuration,
        mockAppointmentData.serviceDetails
      );

      expect(result).toEqual({
        success: true,
        appointmentId: expect.any(String)
      });
      expect(mockFirestore.collection).toHaveBeenCalledWith('appointments');
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    /**
     * Test: Failed Appointment Booking
     * Target: Verify error handling during appointment booking
     * Expected: Return error object with failure message
     */
    it('should handle errors when booking appointment', async () => {
      mockBatch.commit.mockRejectedValueOnce(new Error('Booking failed'));

      const result = await bookAppointment(
        mockAppointmentData.businessId,
        mockAppointmentData.customerId,
        mockAppointmentData.serviceId,
        mockAppointmentData.date,
        mockAppointmentData.startTime,
        mockAppointmentData.slotIndexes,
        mockAppointmentData.serviceDuration,
        mockAppointmentData.serviceDetails
      );

      expect(result).toEqual({
        success: false,
        error: 'Booking failed'
      });
    });
  });

  describe('cancelAppointment', () => {
    const mockCancelData = {
      businessId: 'test-business-id',
      appointmentId: 'test-appointment-id',
      date: '2025-01-21'
    };

    /**
     * Test: Successful Appointment Cancellation
     * Target: Verify that appointments can be cancelled
     * Expected: Appointment status updated to 'cancelled'
     */
    it('should successfully cancel an appointment', async () => {
      const result = await cancelAppointment(
        mockCancelData.businessId,
        mockCancelData.appointmentId,
        mockCancelData.date
      );

      expect(mockFirestore.collection).toHaveBeenCalledWith('appointments');
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    /**
     * Test: Failed Appointment Cancellation
     * Target: Verify error handling during appointment cancellation
     * Expected: Return error object with success: false and error message
     */
    it('should handle errors when cancelling appointment', async () => {
      mockBatch.commit.mockRejectedValueOnce(new Error('Cancellation failed'));

      const result = await cancelAppointment(
        mockCancelData.businessId,
        mockCancelData.appointmentId,
        mockCancelData.date
      );

      expect(result).toEqual({
        success: false,
        error: 'Cancellation failed'
      });
    });
  });
});
