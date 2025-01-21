import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Alert } from 'react-native';

/**
 * Finds available consecutive slots for a service
 */
export const findAvailableSlots = async (businessId, date, serviceDuration, slotDuration = 15) => {
  try {
    // Ensure numeric types
    serviceDuration = parseInt(serviceDuration) || 30;
    slotDuration = parseInt(slotDuration) || 15;

    console.log('🔍 Finding slots:', {
      businessId,
      date,
      serviceDuration,
      slotDuration
    });

    if (!businessId) {
      console.log('❌ No business ID provided');
      return [];
    }

    const slotsDoc = await firestore()
      .collection('businesses')
      .doc(businessId)
      .collection('availableSlots')
      .doc(date)
      .get();

    if (!slotsDoc.exists) {
      console.log('❌ No slots document exists for date:', date);
      return [];
    }

    const data = slotsDoc.data();
    if (!data || !Array.isArray(data.slots)) {
      console.log('❌ Invalid slots data:', data);
      return [];
    }

    const { slots } = data;
    console.log(`✅ Found ${slots.length} total slots, first slot:`, slots[0]);
    
    const requiredSlots = Math.ceil(serviceDuration / slotDuration);
    console.log(`📊 Need ${requiredSlots} consecutive slots for ${serviceDuration} minutes service`);
    
    const availableTimeSlots = [];

    // Convert current time to same timezone as slots
    const now = new Date();
    const currentTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes()
    );

    console.log('⏰ Current time:', currentTime.toLocaleString());

    for (let i = 0; i <= slots.length - requiredSlots; i++) {
      let consecutive = true;
      
      // Check if this slot is in the past
      const slotStartTime = slots[i].startTime;
      // Handle both Timestamp and regular Date objects
      const slotTime = slotStartTime instanceof firestore.Timestamp 
        ? slotStartTime.toDate() 
        : new Date(slotStartTime);

      if (slotTime < currentTime) {
        console.log(`⏪ Skipping past slot: ${slotTime.toLocaleString()}`);
        continue; // Skip slots in the past
      }

      // Check if we have enough consecutive available slots
      for (let j = 0; j < requiredSlots; j++) {
        if (slots[i + j].isBooked) {
          consecutive = false;
          console.log(`❌ Found booked slot at index ${i + j}`);
          break;
        }
      }
      
      if (consecutive) {
        // Handle both Timestamp and regular Date objects for start and end times
        const startTimeObj = slots[i].startTime instanceof firestore.Timestamp 
          ? slots[i].startTime.toDate() 
          : new Date(slots[i].startTime);
          
        const endTimeObj = slots[i + requiredSlots - 1].startTime instanceof firestore.Timestamp 
          ? slots[i + requiredSlots - 1].startTime.toDate() 
          : new Date(slots[i + requiredSlots - 1].startTime);

        availableTimeSlots.push({
          startTime: startTimeObj,
          endTime: endTimeObj,
          slotIndexes: Array.from({ length: requiredSlots }, (_, k) => i + k)
        });
        console.log(`✅ Found available slot: ${startTimeObj.toLocaleString()} - ${endTimeObj.toLocaleString()}`);
      }
    }

    console.log(`📊 Found ${availableTimeSlots.length} available time slots:`, 
      availableTimeSlots.map(slot => ({
        start: slot.startTime.toLocaleTimeString(),
        end: slot.endTime.toLocaleTimeString()
      }))
    );
    
    return availableTimeSlots;
  } catch (error) {
    console.error('❌ Error finding available slots:', error);
    return [];
  }
};

/**
 * Books an appointment by creating an appointment document and updating slots
 */
export const bookAppointment = async (
  businessId,
  customerId,
  serviceId,
  date,
  startTime,
  slotIndexes,
  serviceDuration,
  serviceDetails
) => {
  const batch = firestore().batch();

  try {
    // Create appointment document
    const appointmentRef = firestore().collection('appointments').doc();
    const appointmentData = {
      businessId,
      customerId,
      serviceId,
      startTime: firestore.Timestamp.fromDate(startTime),
      endTime: firestore.Timestamp.fromDate(
        new Date(startTime.getTime() + serviceDuration * 60000)
      ),
      duration: serviceDuration,
      status: 'confirmed',
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      serviceName: serviceDetails.name,
      servicePrice: serviceDetails.price
    };

    batch.set(appointmentRef, appointmentData);

    // Update slots
    const slotsRef = firestore()
      .collection('businesses')
      .doc(businessId)
      .collection('availableSlots')
      .doc(date);

    // Get current slots
    const slotsDoc = await slotsRef.get();
    if (!slotsDoc.exists) throw new Error('Slots not found');

    const { slots } = slotsDoc.data();
    const updatedSlots = [...slots];

    // Mark slots as booked
    slotIndexes.forEach(index => {
      updatedSlots[index] = {
        ...updatedSlots[index],
        isBooked: true,
        appointmentId: appointmentRef.id,
        customerId
      };
    });

    batch.update(slotsRef, { slots: updatedSlots });

    await batch.commit();
    return { success: true, appointmentId: appointmentRef.id };
  } catch (error) {
    console.error('Error booking appointment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Cancels an appointment by updating appointment status and freeing up slots
 */
export const cancelAppointment = async (businessId, appointmentId, date) => {
  const batch = firestore().batch();

  try {
    // Update appointment status
    const appointmentRef = firestore().collection('appointments').doc(appointmentId);
    batch.update(appointmentRef, {
      status: 'cancelled',
      updatedAt: firestore.FieldValue.serverTimestamp()
    });

    // Free up slots
    const slotsRef = firestore()
      .collection('businesses')
      .doc(businessId)
      .collection('availableSlots')
      .doc(date);

    const slotsDoc = await slotsRef.get();
    if (!slotsDoc.exists) throw new Error('Slots not found');

    const { slots } = slotsDoc.data();
    const updatedSlots = slots.map(slot => 
      slot.appointmentId === appointmentId
        ? { ...slot, isBooked: false, appointmentId: null, customerId: null }
        : slot
    );

    batch.update(slotsRef, { slots: updatedSlots });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Gets all appointments for a business on a specific date
 */
export const getBusinessAppointments = async (businessId, date) => {
  try {
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const appointments = await firestore()
      .collection('appointments')
      .where('businessId', '==', businessId)
      .where('startTime', '>=', firestore.Timestamp.fromDate(startOfDay))
      .where('startTime', '<', firestore.Timestamp.fromDate(endOfDay))
      .where('status', '==', 'confirmed')
      .get();

    return appointments.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting business appointments:', error);
    return [];
  }
};

/**
 * Gets all appointments for a customer
 */
export const getCustomerAppointments = async (customerId) => {
  try {
    const appointments = await firestore()
      .collection('appointments')
      .where('customerId', '==', customerId)
      .where('status', 'in', ['confirmed', 'completed'])
      .orderBy('startTime', 'desc')
      .get();

    return appointments.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting customer appointments:', error);
    return [];
  }
};

/**
 * Approves a pending appointment
 * @param {string} businessId - ID of the business approving the appointment
 * @param {string} appointmentId - ID of the appointment to approve
 * @returns {Promise<{success: boolean, error?: string, notification?: Object}>}
 */
export const approveAppointment = async (businessId, appointmentId) => {
  try {
    const appointmentRef = firestore().collection('appointments').doc(appointmentId);
    const appointmentDoc = await appointmentRef.get();

    if (!appointmentDoc.exists) {
      return { success: false, error: 'Appointment not found' };
    }

    const appointment = appointmentDoc.data();

    if (appointment.businessId !== businessId) {
      return { success: false, error: 'Unauthorized access' };
    }

    if (appointment.status !== 'pending') {
      return { success: false, error: 'Appointment is not in pending status' };
    }

    await appointmentRef.update({
      status: 'confirmed',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      notification: {
        type: 'APPOINTMENT_APPROVED',
        customerId: appointment.customerId,
        appointmentId,
        serviceName: appointment.serviceName,
        startTime: appointment.startTime,
      },
    };
  } catch (error) {
    console.error('Error approving appointment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Rejects a pending appointment with a reason
 * @param {string} businessId - ID of the business rejecting the appointment
 * @param {string} appointmentId - ID of the appointment to reject
 * @param {string} reason - Reason for rejection
 * @returns {Promise<{success: boolean, error?: string, notification?: Object}>}
 */
export const rejectAppointment = async (businessId, appointmentId, reason) => {
  try {
    if (!reason || reason.trim() === '') {
      return { success: false, error: 'Rejection reason is required' };
    }

    const appointmentRef = firestore().collection('appointments').doc(appointmentId);
    const appointmentDoc = await appointmentRef.get();

    if (!appointmentDoc.exists) {
      return { success: false, error: 'Appointment not found' };
    }

    const appointment = appointmentDoc.data();

    if (appointment.businessId !== businessId) {
      return { success: false, error: 'Unauthorized access' };
    }

    if (appointment.status !== 'pending') {
      return { success: false, error: 'Appointment is not in pending status' };
    }

    await appointmentRef.update({
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      notification: {
        type: 'APPOINTMENT_REJECTED',
        customerId: appointment.customerId,
        appointmentId,
        serviceName: appointment.serviceName,
        startTime: appointment.startTime,
        reason,
      },
    };
  } catch (error) {
    console.error('Error rejecting appointment:', error);
    return { success: false, error: error.message };
  }
};
