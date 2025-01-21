/**
 * Test Suite: Business Registration and Management
 * 
 * This test suite verifies the business registration and management functionality, including:
 * 1. Business owner registration process
 * 2. Data validation for business registration
 * 3. Firebase authentication integration
 * 4. Business profile creation in Firestore
 * 
 * Database Structure:
 * businesses/
 *   - businessId/
 *     - name: string
 *     - ownerName: string
 *     - ownerPhone: string (format: 05XXXXXXXX)
 *     - businessPhone: string (format: 05XXXXXXXX)
 *     - email: string
 *     - address: string
 *     - categories: string[]
 *     - description: string
 *     - images: string[]
 *     - rating: number
 *     - reviewsCount: number
 *     - workingHours: {
 *         [day]: { open: string, close: string, isOpen: boolean }
 *       }
 */

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Mock Firebase Authentication and Firestore modules
jest.mock('@react-native-firebase/auth', () => {
  const mockAuth = {
    createUserWithEmailAndPassword: jest.fn(),
  };
  return () => mockAuth;
});

jest.mock('@react-native-firebase/firestore', () => {
  const mockFirestore = {
    collection: jest.fn(() => mockFirestore),
    doc: jest.fn(() => mockFirestore),
    set: jest.fn(() => Promise.resolve()),
  };
  return () => mockFirestore;
});

describe('Business Registration Functionality Tests', () => {
  // Test data representing a typical business registration request
  const mockBusinessData = {
    businessName: 'Elegant Hair Salon',
    ownerName: 'John Smith',
    ownerPhone: '0501234567',
    businessPhone: '0509876543',
    email: 'john@eleganthair.com',
    address: 'Main Street 123, Tel Aviv',
    categories: ['מספרות'],
    password: 'Secure123!',
  };

  describe('Registering a business owner case', () => {
    beforeEach(() => {
      // Reset all mock implementations before each test
      jest.clearAllMocks();
    });

    /**
     * Test: Successful Business Registration
     * Target: Verify that a business can be registered with valid data
     * Expected:
     * - Firebase Auth creates new user
     * - Firestore document created with business details
     * - Success response with business ID returned
     */
    it('should successfully register a new business with valid data', async () => {
      // Arrange: Setup mock Firebase responses
      const mockUserId = 'user123';
      const mockUserCredential = {
        user: { uid: mockUserId },
      };

      auth().createUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);
      firestore().collection.mockReturnThis();
      firestore().doc.mockReturnThis();
      firestore().set.mockResolvedValue(true);

      // Act: Attempt to register business
      const result = await registerBusiness(mockBusinessData);

      // Assert: Verify registration success and Firebase calls
      expect(result.success).toBe(true);
      expect(result.businessId).toBe(mockUserId);
      expect(auth().createUserWithEmailAndPassword).toHaveBeenCalledWith(
        mockBusinessData.email,
        mockBusinessData.password
      );
      expect(firestore().collection).toHaveBeenCalledWith('businesses');
      expect(firestore().doc).toHaveBeenCalledWith(mockUserId);
    });

    /**
     * Test: Business Data Validation
     * Target: Verify that business registration data is properly validated
     * Expected: Error thrown for missing business name
     */
    it('should validate business data before registration', () => {
      // Arrange: Create invalid data by removing required field
      const invalidData = { ...mockBusinessData };
      delete invalidData.businessName;

      // Act & Assert: Verify validation error
      expect(() => validateBusinessData(invalidData)).toThrow('Business name is required');
    });

    /**
     * Test: Phone Number Validation
     * Target: Verify that phone numbers follow Israeli format (05XXXXXXXX)
     * Expected: Error thrown for invalid phone format
     */
    it('should validate phone number format', () => {
      // Arrange: Setup data with invalid phone number
      const invalidData = {
        ...mockBusinessData,
        ownerPhone: '123456', // Invalid format
      };

      // Act & Assert: Verify phone validation
      expect(() => validateBusinessData(invalidData)).toThrow('Invalid phone number format');
    });

    /**
     * Test: Email Format Validation
     * Target: Verify that email addresses are properly formatted
     * Expected: Error thrown for invalid email format
     */
    it('should validate email format', () => {
      // Arrange: Setup data with invalid email
      const invalidData = {
        ...mockBusinessData,
        email: 'invalid-email', // Invalid format
      };

      // Act & Assert: Verify email validation
      expect(() => validateBusinessData(invalidData)).toThrow('Invalid email format');
    });

    /**
     * Test: Business Category Requirement
     * Target: Verify that businesses must select at least one category
     * Expected: Error thrown for empty categories array
     */
    it('should require at least one category', () => {
      // Arrange: Setup data with no categories
      const invalidData = {
        ...mockBusinessData,
        categories: [], // Empty categories
      };

      // Act & Assert: Verify category validation
      expect(() => validateBusinessData(invalidData)).toThrow('At least one category is required');
    });

    /**
     * Test: Duplicate Email Handling
     * Target: Verify proper handling of registration with existing email
     * Expected: Registration rejected with appropriate error
     */
    it('should handle registration failure due to existing email', async () => {
      // Arrange: Mock Firebase Auth to reject duplicate email
      auth().createUserWithEmailAndPassword.mockRejectedValue(
        new Error('The email address is already in use')
      );

      // Act & Assert: Verify duplicate email handling
      await expect(registerBusiness(mockBusinessData)).rejects.toThrow(
        'The email address is already in use'
      );
    });

    /**
     * Test: Password Strength Validation
     * Target: Verify that passwords meet minimum security requirements
     * Expected: Error thrown for weak passwords
     */
    it('should validate password strength', () => {
      // Arrange: Setup data with weak password
      const weakPasswordData = {
        ...mockBusinessData,
        password: '123', // Too short
      };

      // Act & Assert: Verify password validation
      expect(() => validateBusinessData(weakPasswordData)).toThrow(
        'Password must be at least 6 characters'
      );
    });
  });
});

/**
 * Validates business registration data against required format and rules
 * @param {Object} data - Business registration data
 * @throws {Error} If validation fails
 * @returns {boolean} True if validation passes
 */
function validateBusinessData(data) {
  const phoneRegex = /^05\d{8}$/; // Israeli mobile number format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!data.businessName) throw new Error('Business name is required');
  if (!data.ownerName) throw new Error('Owner name is required');
  if (!phoneRegex.test(data.ownerPhone)) throw new Error('Invalid phone number format');
  if (!phoneRegex.test(data.businessPhone)) throw new Error('Invalid phone number format');
  if (!emailRegex.test(data.email)) throw new Error('Invalid email format');
  if (!data.address) throw new Error('Address is required');
  if (!data.categories || data.categories.length === 0) throw new Error('At least one category is required');
  if (!data.password || data.password.length < 6) throw new Error('Password must be at least 6 characters');

  return true;
}

/**
 * Registers a new business in the system
 * @param {Object} data - Business registration data
 * @returns {Promise<{success: boolean, businessId: string}>}
 * @throws {Error} If registration fails
 */
async function registerBusiness(data) {
  // Validate input data before proceeding
  validateBusinessData(data);

  // Create Firebase Auth user for business owner
  const { user } = await auth().createUserWithEmailAndPassword(data.email, data.password);

  // Prepare business profile data
  const businessData = {
    businessId: user.uid,
    name: data.businessName.trim(),
    ownerName: data.ownerName.trim(),
    ownerPhone: data.ownerPhone,
    businessPhone: data.businessPhone,
    email: data.email,
    address: data.address,
    categories: data.categories,
    description: '',
    images: [],
    rating: 0,
    reviewsCount: 0,
    // Default working hours template (can be customized later)
    workingHours: {
      sunday: { open: '09:00', close: '17:00', isOpen: true },
      monday: { open: '09:00', close: '17:00', isOpen: true },
      tuesday: { open: '09:00', close: '17:00', isOpen: true },
      wednesday: { open: '09:00', close: '17:00', isOpen: true },
      thursday: { open: '09:00', close: '17:00', isOpen: true },
      friday: { open: '09:00', close: '14:00', isOpen: true },
      saturday: { open: '00:00', close: '00:00', isOpen: false },
    },
  };

  // Create business profile in Firestore
  await firestore().collection('businesses').doc(user.uid).set(businessData);

  return {
    success: true,
    businessId: user.uid,
  };
}
