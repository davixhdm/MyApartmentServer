const express = require('express');
const Property = require('../models/Property');
const axios = require('axios');

const router = express.Router();

// @desc    Get weather for Nairobi
// @route   GET /api/weather
// @access  Public
router.get('/weather', async (req, res, next) => {
  try {
    // You can implement caching here (Redis or memory-cache)
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=Nairobi,ke&units=metric&appid=${process.env.WEATHER_API_KEY}`
    );
    
    res.json({
      success: true,
      data: {
        temperature: Math.round(response.data.main.temp),
        condition: response.data.weather[0].main,
        icon: response.data.weather[0].icon,
        humidity: response.data.main.humidity,
        windSpeed: response.data.wind.speed
      }
    });
  } catch (err) {
    // Return mock data if API fails
    res.json({
      success: true,
      data: {
        temperature: 16,
        condition: 'Sunny',
        icon: '01d',
        humidity: 65,
        windSpeed: 3.1
      }
    });
  }
});

// @desc    Get stats for landing page
// @route   GET /api/stats
// @access  Public
router.get('/stats', async (req, res, next) => {
  try {
    const propertiesCount = await Property.countDocuments({ status: 'available' });
    const tenantsCount = await User.countDocuments({ role: 'tenant' });
    
    res.json({
      success: true,
      data: {
        availableProperties: propertiesCount,
        happyTenants: tenantsCount,
        cities: 5, // You can make this dynamic
        support: '24/7'
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;