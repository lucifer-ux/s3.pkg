import { v4 as uuidv4 } from 'uuid';
import { getFirestore } from '../config/firebase.js';

const generateId = (prefix) => `${prefix}_${uuidv4().split('-')[0]}${Date.now().toString(36)}`;

class FirebaseService {
  constructor() {
    this.db = null;
    this.collections = null;
  }

  init() {
    if (!this.db) {
      console.log('[FirebaseService] Initializing Firestore connection...');
      this.db = getFirestore();
      this.collections = {
        orders: this.db.collection('orders'),
        users: this.db.collection('users'),
        offerPackets: this.db.collection('offerPackets'),
        loans: this.db.collection('loans'),
      };
      console.log('[FirebaseService] Firestore initialized successfully');
    }
  }

  async createOrder(orderData) {
    console.log('[FirebaseService] ========== CREATE ORDER STARTED ==========');
    this.init();
    
    const orderId = generateId('ORD');
    console.log('[FirebaseService] Generated orderId:', orderId);
    console.log('[FirebaseService] Order data received:', JSON.stringify(orderData, null, 2));
    
    const order = {
      orderId,
      ...orderData,
      status: 'created',
      createdAt: new Date(),
      updatedAt: new Date(),
      timeline: [{
        status: 'created',
        timestamp: new Date(),
      }],
    };
    
    console.log('[FirebaseService] Saving order to Firestore collection: orders');
    console.log('[FirebaseService] Document ID:', orderId);
    
    try {
      await this.collections.orders.doc(orderId).set(order);
      console.log('[FirebaseService] Order SAVED successfully:', orderId);
      console.log('[FirebaseService] Collection: orders, Doc ID:', orderId);
      console.log('[FirebaseService] ========== CREATE ORDER COMPLETED ==========');
      return order;
    } catch (error) {
      console.error('[FirebaseService] ERROR saving order:', error.message);
      console.error('[FirebaseService] Stack:', error.stack);
      throw error;
    }
  }

  async updateOrder(orderId, updateData) {
    console.log('[FirebaseService] ========== UPDATE ORDER STARTED ==========');
    console.log('[FirebaseService] Order ID:', orderId);
    console.log('[FirebaseService] Update data:', JSON.stringify(updateData, null, 2));
    
    this.init();
    const orderRef = this.collections.orders.doc(orderId);
    
    console.log('[FirebaseService] Fetching existing order...');
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      console.error('[FirebaseService] Order NOT FOUND:', orderId);
      throw new Error('Order not found');
    }
    console.log('[FirebaseService] Existing order found');

    const currentData = orderDoc.data();
    const update = {
      ...updateData,
      updatedAt: new Date(),
    };

    if (updateData.status && updateData.status !== currentData.status) {
      console.log(`[FirebaseService] Status change: ${currentData.status} -> ${updateData.status}`);
      update.timeline = [
        ...(currentData.timeline || []),
        {
          status: updateData.status,
          timestamp: new Date(),
          notes: updateData.notes,
        },
      ];
    }

    console.log('[FirebaseService] Saving order update to Firestore...');
    await orderRef.update(update);
    console.log('[FirebaseService] Order UPDATED successfully:', orderId);
    console.log('[FirebaseService] ========== UPDATE ORDER COMPLETED ==========');
    return { ...currentData, ...update };
  }

  async getOrder(orderId) {
    console.log('[FirebaseService] Getting order:', orderId);
    this.init();
    const orderDoc = await this.collections.orders.doc(orderId).get();
    if (!orderDoc.exists) {
      console.log('[FirebaseService] Order not found:', orderId);
      return null;
    }
    console.log('[FirebaseService] Order found:', orderId);
    return orderDoc.data();
  }

  async createOrUpdateUser(userData) {
    console.log('[FirebaseService] ========== CREATE/UPDATE USER STARTED ==========');
    console.log('[FirebaseService] User data:', JSON.stringify(userData, null, 2));
    
    this.init();
    const { mobileNumber } = userData;
    
    console.log('[FirebaseService] Checking for existing user with mobile:', mobileNumber);
    const usersSnapshot = await this.collections.users
      .where('mobileNumber', '==', mobileNumber)
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      console.log('[FirebaseService] Existing user found, updating...');
      const userDoc = usersSnapshot.docs[0];
      const userId = userDoc.id;
      const currentData = userDoc.data();
      console.log('[FirebaseService] Existing userId:', userId);

      const update = {
        ...userData,
        updatedAt: new Date(),
      };

      if (userData.orderId && !currentData.orders?.find(o => o.orderId === userData.orderId)) {
        console.log('[FirebaseService] Adding new order to user:', userData.orderId);
        update.orders = [
          ...(currentData.orders || []),
          { orderId: userData.orderId, createdAt: new Date() },
        ];
      }

      console.log('[FirebaseService] Saving user update to Firestore...');
      await this.collections.users.doc(userId).update(update);
      console.log('[FirebaseService] User UPDATED successfully:', userId);
      console.log('[FirebaseService] ========== UPDATE USER COMPLETED ==========');
      return { ...currentData, ...update, userId };
    }

    console.log('[FirebaseService] No existing user found, creating new user...');
    const userId = generateId('USR');
    console.log('[FirebaseService] Generated userId:', userId);
    
    const user = {
      userId,
      ...userData,
      orders: userData.orderId ? [{ orderId: userData.orderId, createdAt: new Date() }] : [],
      kycStatus: {
        mobile: 'verified',
        pan: 'pending',
        overall: 'partial',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('[FirebaseService] Saving new user to Firestore collection: users');
    console.log('[FirebaseService] Document ID:', userId);
    await this.collections.users.doc(userId).set(user);
    console.log('[FirebaseService] User CREATED successfully:', userId);
    console.log('[FirebaseService] ========== CREATE USER COMPLETED ==========');
    return user;
  }

  async updateUserPan(userId, panData) {
    console.log('[FirebaseService] ========== UPDATE USER PAN STARTED ==========');
    console.log('[FirebaseService] User ID:', userId);
    console.log('[FirebaseService] PAN data:', JSON.stringify(panData, null, 2));
    
    this.init();
    const userRef = this.collections.users.doc(userId);
    
    console.log('[FirebaseService] Fetching user...');
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.error('[FirebaseService] User NOT FOUND:', userId);
      throw new Error('User not found');
    }
    console.log('[FirebaseService] User found');

    const update = {
      panData: {
        ...panData,
        verifiedAt: new Date(),
      },
      kycStatus: {
        mobile: 'verified',
        pan: 'verified',
        overall: 'complete',
      },
      updatedAt: new Date(),
    };

    console.log('[FirebaseService] Saving PAN update to Firestore...');
    await userRef.update(update);
    console.log('[FirebaseService] User PAN UPDATED successfully:', userId);
    console.log('[FirebaseService] ========== UPDATE USER PAN COMPLETED ==========');
    return { ...userDoc.data(), ...update };
  }

  async getUser(userId) {
    console.log('[FirebaseService] Getting user:', userId);
    this.init();
    const userDoc = await this.collections.users.doc(userId).get();
    if (!userDoc.exists) {
      console.log('[FirebaseService] User not found:', userId);
      return null;
    }
    console.log('[FirebaseService] User found:', userId);
    return { ...userDoc.data(), userId };
  }

  async getUserByMobile(mobileNumber) {
    console.log('[FirebaseService] Getting user by mobile:', mobileNumber);
    this.init();
    const usersSnapshot = await this.collections.users
      .where('mobileNumber', '==', mobileNumber)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.log('[FirebaseService] User not found with mobile:', mobileNumber);
      return null;
    }
    const userDoc = usersSnapshot.docs[0];
    console.log('[FirebaseService] User found by mobile:', mobileNumber);
    return { ...userDoc.data(), userId: userDoc.id };
  }

  async createOfferPacket(packetData) {
    console.log('[FirebaseService] ========== CREATE OFFER PACKET STARTED ==========');
    console.log('[FirebaseService] Packet data:', JSON.stringify(packetData, null, 2));
    
    this.init();
    const packetId = generateId('OFP');
    console.log('[FirebaseService] Generated packetId:', packetId);
    
    const packet = {
      packetId,
      ...packetData,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('[FirebaseService] Saving offer packet to Firestore collection: offerPackets');
    console.log('[FirebaseService] Number of offers:', packetData.offers?.length || 0);
    await this.collections.offerPackets.doc(packetId).set(packet);
    console.log('[FirebaseService] Offer packet CREATED successfully:', packetId);
    console.log('[FirebaseService] ========== CREATE OFFER PACKET COMPLETED ==========');
    return packet;
  }

  async selectOffer(packetId, offerId, tenure) {
    console.log('[FirebaseService] ========== SELECT OFFER STARTED ==========');
    console.log('[FirebaseService] Packet ID:', packetId);
    console.log('[FirebaseService] Offer ID:', offerId);
    console.log('[FirebaseService] Tenure:', tenure);
    
    this.init();
    const packetRef = this.collections.offerPackets.doc(packetId);
    
    console.log('[FirebaseService] Fetching offer packet...');
    const packetDoc = await packetRef.get();
    
    if (!packetDoc.exists) {
      console.error('[FirebaseService] Offer packet NOT FOUND:', packetId);
      throw new Error('Offer packet not found');
    }
    console.log('[FirebaseService] Offer packet found');

    const update = {
      selectedOffer: {
        offerId,
        selectedAt: new Date(),
        tenure,
      },
      status: 'converted',
      updatedAt: new Date(),
    };

    console.log('[FirebaseService] Saving offer selection to Firestore...');
    await packetRef.update(update);
    console.log('[FirebaseService] Offer SELECTED successfully:', offerId);
    console.log('[FirebaseService] ========== SELECT OFFER COMPLETED ==========');
    return { ...packetDoc.data(), ...update };
  }

  async getOfferPacket(packetId) {
    console.log('[FirebaseService] Getting offer packet:', packetId);
    this.init();
    const packetDoc = await this.collections.offerPackets.doc(packetId).get();
    if (!packetDoc.exists) {
      console.log('[FirebaseService] Offer packet not found:', packetId);
      return null;
    }
    console.log('[FirebaseService] Offer packet found:', packetId);
    return packetDoc.data();
  }

  async createLoan(loanData) {
    console.log('[FirebaseService] ========== CREATE LOAN STARTED ==========');
    console.log('[FirebaseService] Loan data:', JSON.stringify(loanData, null, 2));
    
    this.init();
    const loanId = generateId('LOA');
    console.log('[FirebaseService] Generated loanId:', loanId);
    
    const loan = {
      loanId,
      ...loanData,
      status: 'initiated',
      createdAt: new Date(),
      updatedAt: new Date(),
      timeline: [{
        status: 'initiated',
        timestamp: new Date(),
      }],
    };

    console.log('[FirebaseService] Saving loan to Firestore collection: loans');
    console.log('[FirebaseService] Lender:', loanData.loanDetails?.lender);
    console.log('[FirebaseService] Loan amount:', loanData.loanDetails?.loanAmount);
    await this.collections.loans.doc(loanId).set(loan);
    console.log('[FirebaseService] Loan CREATED successfully:', loanId);
    console.log('[FirebaseService] ========== CREATE LOAN COMPLETED ==========');
    return loan;
  }

  async completeLoan(loanId, disbursementDetails) {
    console.log('[FirebaseService] ========== COMPLETE LOAN STARTED ==========');
    console.log('[FirebaseService] Loan ID:', loanId);
    console.log('[FirebaseService] Disbursement details:', JSON.stringify(disbursementDetails, null, 2));
    
    this.init();
    const loanRef = this.collections.loans.doc(loanId);
    
    console.log('[FirebaseService] Fetching loan...');
    const loanDoc = await loanRef.get();
    
    if (!loanDoc.exists) {
      console.error('[FirebaseService] Loan NOT FOUND:', loanId);
      throw new Error('Loan not found');
    }

    const currentData = loanDoc.data();
    const update = {
      status: 'disbursed',
      disbursement: {
        disbursedAt: new Date(),
        ...disbursementDetails,
      },
      updatedAt: new Date(),
      timeline: [
        ...(currentData.timeline || []),
        {
          status: 'disbursed',
          timestamp: new Date(),
          notes: 'Loan disbursed successfully',
        },
      ],
    };

    console.log('[FirebaseService] Saving loan completion to Firestore...');
    await loanRef.update(update);
    console.log('[FirebaseService] Loan COMPLETED successfully:', loanId);
    console.log('[FirebaseService] ========== COMPLETE LOAN COMPLETED ==========');
    return { ...currentData, ...update };
  }

  async getLoan(loanId) {
    console.log('[FirebaseService] Getting loan:', loanId);
    this.init();
    const loanDoc = await this.collections.loans.doc(loanId).get();
    if (!loanDoc.exists) {
      console.log('[FirebaseService] Loan not found:', loanId);
      return null;
    }
    console.log('[FirebaseService] Loan found:', loanId);
    return loanDoc.data();
  }

  async updateUserCreditLine(userId, creditLine) {
    console.log('[FirebaseService] Updating credit line for user:', userId);
    this.init();
    const userRef = this.collections.users.doc(userId);
    
    await userRef.update({
      creditLine: creditLine,
      updatedAt: new Date(),
    });
    
    console.log('[FirebaseService] Credit line updated successfully');
  }
}

const firebaseService = new FirebaseService();
export default firebaseService;
