/**
 * Test Suite: Appointment Approval System
 * 
 * This test suite verifies the business owner's ability to approve or reject
 * appointment requests from customers. The system includes:
 * 1. Appointment approval workflow
 * 2. Appointment rejection with reason
 * 3. Customer notification system
 * 4. Error handling for various edge cases
 * 
 * Database Structure:
 * appointments/
 *   - appointmentId/
 *     - businessId: string
 *     - customerId: string
 *     - status: 'pending' | 'confirmed' | 'rejected'
 *     - startTime: Date
 *     - serviceName: string
 *     - servicePrice: number
 *     - rejectionReason?: string
 *     - updatedAt: Timestamp
 */

import firestore from '@react-native-firebase/firestore';

// Import the functions we're testing
import { approveAppointment, rejectAppointment } from '../src/utils/appointmentUtils';

// Mock Firebase Firestore with collection, document, and field operations
jest.mock('@react-native-firebase/firestore', () => {
  const mockFirestore = {
    collection: jest.fn(() => mockFirestore),
    doc: jest.fn(() => mockFirestore),
    get: jest.fn(),
    update: jest.fn(() => Promise.resolve()),
  };

  const firestoreInstance = jest.fn(() => mockFirestore);
  
  // Add static Firestore properties
  firestoreInstance.FieldValue = {
    serverTimestamp: jest.fn(() => ({ type: 'timestamp', value: new Date().toISOString() }))
  };

  return {
    __esModule: true,
    default: firestoreInstance
  };
});

describe('Appointment Approval/Rejection Tests', () => {
  // Test constants for consistent use across test cases
  const mockBusinessId = 'business123';
  const mockCustomerId = 'customer456';
  const mockAppointmentId = 'appointment789';
  const mockDate = '2025-01-21';
  const mockStartTime = '13:00';

  beforeEach(() => {
    // Reset all mock function calls before each test
    jest.clearAllMocks();
    
    // Setup default mock implementation
    firestore().update.mockResolvedValue(true);
  });

  describe('Approval/Rejection of appointment by business owner case', () => {
    /**
     * Test: Successful Appointment Approval
     * Target: Verify that a business owner can approve a pending appointment
     * Expected: 
     * - Appointment status updated to 'confirmed'
     * - Updated timestamp set
     * - Success response returned
     */
    it('should successfully approve a pending appointment', async () => {
      // Arrange: Setup mock appointment data
      const mockAppointment = {
        id: mockAppointmentId,
        businessId: mockBusinessId,
        customerId: mockCustomerId,
        status: 'pending',
        startTime: new Date(`${mockDate}T${mockStartTime}`),
        serviceName: 'Haircut',
        servicePrice: 100,
      };

      // Setup Firestore mock responses
      firestore().get.mockResolvedValue({
        exists: true,
        data: () => mockAppointment,
      });

      // Act: Call the approval function
      const result = await approveAppointment(mockBusinessId, mockAppointmentId);

      // Assert: Verify the expected outcomes
      expect(result.success).toBe(true);
      expect(firestore().collection).toHaveBeenCalledWith('appointments');
      expect(firestore().doc).toHaveBeenCalledWith(mockAppointmentId);
      expect(firestore().update).toHaveBeenCalledWith({
        status: 'confirmed',
        updatedAt: expect.any(Object),
      });
    });

    /**
     * Test: Successful Appointment Rejection
     * Target: Verify that a business owner can reject an appointment with a reason
     * Expected:
     * - Appointment status updated to 'rejected'
     * - Rejection reason stored
     * - Updated timestamp set
     */
    it('should successfully reject a pending appointment with reason', async () => {
      // Arrange: Setup mock appointment data
      const mockAppointment = {
        id: mockAppointmentId,
        businessId: mockBusinessId,
        customerId: mockCustomerId,
        status: 'pending',
        startTime: new Date(`${mockDate}T${mockStartTime}`),
      };
      const rejectionReason = 'Schedule conflict';

      // Setup Firestore mock responses
      firestore().get.mockResolvedValue({
        exists: true,
        data: () => mockAppointment,
      });

      // Act: Call the rejection function
      const result = await rejectAppointment(mockBusinessId, mockAppointmentId, rejectionReason);

      // Assert: Verify the expected outcomes
      expect(result.success).toBe(true);
      expect(firestore().collection).toHaveBeenCalledWith('appointments');
      expect(firestore().doc).toHaveBeenCalledWith(mockAppointmentId);
      expect(firestore().update).toHaveBeenCalledWith({
        status: 'rejected',
        rejectionReason,
        updatedAt: expect.any(Object),
      });
    });

    /**
     * Test: Customer Notification on Approval
     * Target: Verify that customers are notified when their appointment is approved
     * Expected: Notification object contains correct customer ID and approval type
     */
    it('should notify customer when appointment is approved', async () => {
      // Arrange: Setup mock appointment with customer data
      const mockAppointment = {
        id: mockAppointmentId,
        businessId: mockBusinessId,
        customerId: mockCustomerId,
        status: 'pending',
        startTime: new Date(`${mockDate}T${mockStartTime}`),
        serviceName: 'Haircut',
      };

      // Setup Firestore mock responses
      firestore().get.mockResolvedValue({
        exists: true,
        data: () => mockAppointment,
      });

      // Act: Approve the appointment
      const result = await approveAppointment(mockBusinessId, mockAppointmentId);

      // Assert: Verify notification details
      expect(result.success).toBe(true);
      expect(result.notification).toBeDefined();
      expect(result.notification.customerId).toBe(mockCustomerId);
      expect(result.notification.type).toBe('APPOINTMENT_APPROVED');
    });

    /**
     * Test: Customer Notification on Rejection
     * Target: Verify that customers are notified when their appointment is rejected
     * Expected: Notification includes customer ID, rejection type, and reason
     */
    it('should notify customer when appointment is rejected', async () => {
      // Arrange: Setup mock appointment with customer data
      const mockAppointment = {
        id: mockAppointmentId,
        businessId: mockBusinessId,
        customerId: mockCustomerId,
        status: 'pending',
        startTime: new Date(`${mockDate}T${mockStartTime}`),
        serviceName: 'Haircut',
      };
      const rejectionReason = 'Fully booked';

      // Setup Firestore mock responses
      firestore().get.mockResolvedValue({
        exists: true,
        data: () => mockAppointment,
      });

      // Act: Reject the appointment
      const result = await rejectAppointment(mockBusinessId, mockAppointmentId, rejectionReason);

      // Assert: Verify notification details
      expect(result.success).toBe(true);
      expect(result.notification).toBeDefined();
      expect(result.notification.customerId).toBe(mockCustomerId);
      expect(result.notification.type).toBe('APPOINTMENT_REJECTED');
      expect(result.notification.reason).toBe(rejectionReason);
    });

    describe('Error cases', () => {
      /**
       * Test: Non-existent Appointment
       * Target: Verify proper error handling when appointment doesn't exist
       * Expected: Error response with 'Appointment not found' message
       */
      it('should fail to approve non-existent appointment', async () => {
        // Arrange: Setup mock for non-existent appointment
        firestore().get.mockResolvedValue({
          exists: false,
        });

        // Act: Attempt to approve non-existent appointment
        const result = await approveAppointment(mockBusinessId, mockAppointmentId);

        // Assert: Verify error response
        expect(result.success).toBe(false);
        expect(result.error).toBe('Appointment not found');
      });

      /**
       * Test: Unauthorized Business Access
       * Target: Verify that businesses can't approve appointments they don't own
       * Expected: Error response with 'Unauthorized access' message
       */
      it('should fail to approve appointment from different business', async () => {
        // Arrange: Setup mock with mismatched business ID
        const wrongBusinessId = 'wrong123';
        const mockAppointment = {
          id: mockAppointmentId,
          businessId: mockBusinessId,
          status: 'pending',
        };

        firestore().get.mockResolvedValue({
          exists: true,
          data: () => mockAppointment,
        });

        // Act: Attempt to approve with wrong business ID
        const result = await approveAppointment(wrongBusinessId, mockAppointmentId);

        // Assert: Verify unauthorized access error
        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized access');
      });

      /**
       * Test: Missing Rejection Reason
       * Target: Verify that rejections require a reason
       * Expected: Error response for missing rejection reason
       */
      it('should fail to reject without reason', async () => {
        // Arrange: Setup mock appointment
        const mockAppointment = {
          id: mockAppointmentId,
          businessId: mockBusinessId,
          status: 'pending',
        };

        firestore().get.mockResolvedValue({
          exists: true,
          data: () => mockAppointment,
        });

        // Act: Attempt to reject without a reason
        const result = await rejectAppointment(mockBusinessId, mockAppointmentId, '');

        // Assert: Verify error for missing reason
        expect(result.success).toBe(false);
        expect(result.error).toBe('Rejection reason is required');
      });

      /**
       * Test: Already Processed Appointment
       * Target: Verify that only pending appointments can be processed
       * Expected: Error response for non-pending appointments
       */
      it('should fail to approve already processed appointment', async () => {
        // Arrange: Setup mock for already confirmed appointment
        const mockAppointment = {
          id: mockAppointmentId,
          businessId: mockBusinessId,
          status: 'confirmed',
        };

        firestore().get.mockResolvedValue({
          exists: true,
          data: () => mockAppointment,
        });

        // Act: Attempt to approve already confirmed appointment
        const result = await approveAppointment(mockBusinessId, mockAppointmentId);

        // Assert: Verify error for invalid status
        expect(result.success).toBe(false);
        expect(result.error).toBe('Appointment is not in pending status');
      });
    });
  });
});
