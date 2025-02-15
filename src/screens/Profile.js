import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, StyleSheet, ScrollView, TouchableOpacity, I18nManager, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Color, FontFamily } from '../styles/GlobalStyles';
import { Ionicons } from '@expo/vector-icons';
import BottomNavigation from '../components/common/BottomNavigation';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Force RTL
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const Profile = ({ navigation }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    appointments: 0,
    favorites: 0
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        navigation.navigate('Login');
        return;
      }

      // Fetch user profile data
      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        setUserInfo({
          name: userData.name || 'משתמש חדש',
          email: userData.email || currentUser.email,
          phone: userData.phone || '',
        });

        // Get appointments count using customerId
        const appointmentsSnapshot = await firestore()
          .collection('appointments')
          .where('customerId', '==', currentUser.uid)
          .get();

        // Get favorites count
        const userFavorites = userData.favorites || [];

        setStats({
          appointments: appointmentsSnapshot.size,
          favorites: userFavorites.length
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth().signOut();
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleMenuPress = (menuItem) => {
    switch (menuItem) {
      case 'appointments':
        navigation.navigate('Appointments');
        break;
      case 'favorites':
        navigation.navigate('Saved');
        break;
      case 'personalDetails':
        navigation.navigate('PersonalDetails');
        break;
      case 'notifications':
        navigation.navigate('NotificationSettings');
        break;
      case 'about':
        navigation.navigate('About');
        break;
      case 'logout':
        handleLogout();
        break;
      default:
        console.log('Pressed:', menuItem);
    }
  };

  const menuItems = [
    { id: 'appointments', icon: '📅', title: 'תורים' },
    { id: 'favorites', icon: '❤️', title: 'מועדפים' },
    { id: 'personalDetails', icon: '👤', title: 'פרטים אישיים' },
    { id: 'notifications', icon: '🔔', title: 'התראות' },
    { id: 'about', icon: 'ℹ️', title: 'אודות' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Color.primaryColorAmaranthPurple} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>הפרופיל שלי</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={require('../assets/ic--profile.png')}
              style={styles.avatar}
              contentFit="cover"
            />
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="pencil" size={16} color={Color.grayscaleColorWhite} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{userInfo?.name}</Text>
          <Text style={styles.userEmail}>{userInfo?.email}</Text>
          {userInfo?.phone && <Text style={styles.userPhone}>{userInfo.phone}</Text>}

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.appointments}</Text>
              <Text style={styles.statLabel}>תורים</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.favorites}</Text>
              <Text style={styles.statLabel}>מועדפים</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleMenuPress(item.id)}
            >
              <View style={styles.menuContent}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-back" size={24} color={Color.grayscaleColorSpanishGray} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => handleMenuPress('logout')}>
          <Text style={styles.logoutText}>התנתקות</Text>
          <Ionicons name="log-out-outline" size={24} color={Color.primaryColorAmaranthPurple} />
        </TouchableOpacity>
      </ScrollView>
      <BottomNavigation 
        activeTab="profile"
        onTabPress={(tabId) => {
          if (tabId !== 'profile') {
            const screens = {
              home: 'Home',
              appointments: 'MyAppointments',
              saved: 'Saved',
            };
            if (screens[tabId]) {
              navigation.navigate(screens[tabId]);
            }
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.grayscaleColorWhite,
  },
  scrollView: {
    flex: 1,
    marginBottom: 70, // Add margin for bottom navigation
  },
  header: {
    padding: 16,
    backgroundColor: Color.primaryColorAmaranthPurple,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FontFamily.assistantBold,
    color: Color.grayscaleColorWhite,
  },
  profileCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: Color.grayscaleColorWhite,
    borderRadius: 20,
    marginTop: -20,
    marginHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Color.primaryColorAmaranthPurple,
    padding: 8,
    borderRadius: 20,
  },
  userName: {
    fontSize: 24,
    fontFamily: FontFamily.assistantBold,
    color: Color.grayscaleColorBlack,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    fontFamily: FontFamily.assistantRegular,
    color: Color.grayscaleColorSpanishGray,
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 16,
    fontFamily: FontFamily.assistantRegular,
    color: Color.grayscaleColorSpanishGray,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Color.colorGainsboro,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: FontFamily.assistantBold,
    color: Color.primaryColorAmaranthPurple,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: FontFamily.assistantRegular,
    color: Color.grayscaleColorSpanishGray,
  },
  menuContainer: {
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: Color.grayscaleColorWhite,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontFamily: FontFamily.assistantRegular,
    color: Color.grayscaleColorBlack,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    backgroundColor: Color.grayscaleColorWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Color.primaryColorAmaranthPurple,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: FontFamily.assistantBold,
    color: Color.primaryColorAmaranthPurple,
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Profile;
