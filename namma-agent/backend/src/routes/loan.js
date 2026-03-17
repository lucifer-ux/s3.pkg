import express from 'express';
import firebaseService from '../services/firebaseService.js';

const router = express.Router();

// Create order
router.post('/order/create', async (req, res) => {
  console.log('[API] POST /api/loan/order/create called');
  
  try {
    const { product, paymentMethod, metadata } = req.body;
    
    const order = await firebaseService.createOrder({
      product: {
        id: product?.id || 'unknown',
        name: product?.name || 'Unknown Product',
        price: product?.price || 0,
        currency: 'INR',
        image: product?.image,
      },
      paymentMethod: paymentMethod || 'emi',
      metadata: {
        source: metadata?.source || 'web',
        userAgent: metadata?.userAgent,
        ipAddress: req.ip,
      },
    });
    
    res.json({
      success: true,
      orderId: order.orderId,
      data: order,
    });
  } catch (error) {
    console.error('[API] Error creating order:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get user by mobile with OTP verification
router.get('/user/mobile/:mobileNumber', async (req, res) => {
  console.log('[API] GET /api/loan/user/mobile/:mobileNumber called');
  
  try {
    const { mobileNumber } = req.params;
    
    const user = await firebaseService.getUserByMobile(mobileNumber);
    
    if (!user) {
      return res.json({
        success: true,
        exists: false,
        message: 'User not found, will create new user',
      });
    }
    
    res.json({
      success: true,
      exists: true,
      userId: user.userId,
      data: {
        userId: user.userId,
        mobileNumber: user.mobileNumber,
        panData: user.panData,
        kycStatus: user.kycStatus,
        creditLine: user.creditLine,
      },
    });
  } catch (error) {
    console.error('[API] Error getting user:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Verify OTP (fake - accepts 123456)
router.post('/user/verify-otp', async (req, res) => {
  console.log('[API] POST /api/loan/user/verify-otp called');
  
  try {
    const { mobileNumber, otp } = req.body;
    
    if (otp !== '123456') {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP',
      });
    }
    
    // Check if user exists
    const existingUser = await firebaseService.getUserByMobile(mobileNumber);
    
    if (existingUser) {
      // Return existing user
      return res.json({
        success: true,
        verified: true,
        isNewUser: false,
        userId: existingUser.userId,
        data: existingUser,
      });
    }
    
    // New user
    res.json({
      success: true,
      verified: true,
      isNewUser: true,
      message: 'OTP verified, proceed to create user',
    });
  } catch (error) {
    console.error('[API] Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Create or update user
router.post('/user/create-or-update', async (req, res) => {
  console.log('[API] POST /api/loan/user/create-or-update called');
  
  try {
    const { mobileNumber, orderId, deviceInfo } = req.body;
    
    if (!mobileNumber) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number is required',
      });
    }
    
    const user = await firebaseService.createOrUpdateUser({
      mobileNumber,
      orderId,
      deviceInfo,
    });
    
    if (orderId) {
      await firebaseService.updateOrder(orderId, {
        userId: user.userId,
        status: 'user_identified',
      });
    }
    
    res.json({
      success: true,
      userId: user.userId,
      isNewUser: !user.panData,
      data: {
        userId: user.userId,
        mobileNumber: user.mobileNumber,
        kycStatus: user.kycStatus,
        creditLine: user.creditLine,
      },
    });
  } catch (error) {
    console.error('[API] Error creating/updating user:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Update PAN and create credit line
router.post('/user/update-pan', async (req, res) => {
  console.log('[API] POST /api/loan/user/update-pan called');
  
  try {
    const { userId, panData, orderId } = req.body;
    
    // Check if user already has a credit line
    const existingUser = await firebaseService.getUser(userId);
    
    const updateData = {
      panNumber: panData.panNumber,
      name: panData.name,
      fatherName: panData.fatherName,
      dateOfBirth: panData.dateOfBirth,
    };
    
    // Get order amount for credit line calculation
    let orderAmount = 100000; // Default 1L
    if (orderId) {
      const order = await firebaseService.getOrder(orderId);
      if (order && order.product && order.product.price) {
        orderAmount = order.product.price;
      }
    }
    
    // Create credit line for new users (3x the order amount)
    if (!existingUser?.creditLine) {
      const creditLineAmount = orderAmount * 3;
      updateData.creditLine = {
        amount: creditLineAmount,
        used: 0,
        available: creditLineAmount,
        createdAt: new Date(),
        basedOnOrder: orderId,
        multiplier: 3,
      };
      console.log('[API] Created credit line (3x order amount):', creditLineAmount, 'for order:', orderAmount);
    }
    
    const user = await firebaseService.updateUserPan(userId, updateData);
    
    if (orderId) {
      await firebaseService.updateOrder(orderId, {
        status: 'pan_verified',
      });
    }
    
    res.json({
      success: true,
      data: {
        userId: user.userId,
        panData: user.panData,
        kycStatus: user.kycStatus,
        creditLine: user.creditLine,
      },
    });
  } catch (error) {
    console.error('[API] Error updating PAN:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Use credit line for payment
router.post('/user/use-credit-line', async (req, res) => {
  console.log('[API] POST /api/loan/user/use-credit-line called');
  
  try {
    const { userId, amount, orderId } = req.body;
    
    const user = await firebaseService.getUser(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    
    if (!user.creditLine) {
      return res.status(400).json({
        success: false,
        error: 'No credit line available',
      });
    }
    
    if (user.creditLine.available < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient credit line',
        available: user.creditLine.available,
        requested: amount,
      });
    }
    
    // Update credit line
    const updatedCreditLine = {
      ...user.creditLine,
      used: user.creditLine.used + amount,
      available: user.creditLine.available - amount,
      lastUsed: new Date(),
    };
    
    await firebaseService.updateUserCreditLine(userId, updatedCreditLine);
    
    if (orderId) {
      await firebaseService.updateOrder(orderId, {
        status: 'payment_completed',
        paymentMethod: 'credit_line',
        amount: amount,
      });
    }
    
    res.json({
      success: true,
      message: 'Payment successful using credit line',
      creditLine: updatedCreditLine,
    });
  } catch (error) {
    console.error('[API] Error using credit line:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
