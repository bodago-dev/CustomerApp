import locationService from './LocationService';

/**
 * Service for calculating fare estimates based on distance, vehicle type, and package size.
 */
class FareService {
  // Base prices per km for each vehicle type (in TZS)
  VEHICLE_RATES = {
    boda: {
      baseRate: 2000,
      perKm: 500,
      minFare: 1000,
      averageSpeed: 30, // km/h
    },
    bajaji: {
      baseRate: 3000,
      perKm: 750,
      minFare: 2000,
      averageSpeed: 25, // km/h
    },
    guta: {
      baseRate: 5000,
      perKm: 1000,
      minFare: 5000,
      averageSpeed: 20, // km/h
    }
  };

  // Size multipliers
  SIZE_MULTIPLIERS = {
    small: 1.0,
    medium: 1.5,
    large: 1.8
  };

  SERVICE_FEE_RATE = 0.18; // 18%

  /**
   * Calculates the distance between two points in kilometers.
   * @param {Object} pickupCoordinates - { latitude, longitude }
   * @param {Object} dropoffCoordinates - { latitude, longitude }
   * @returns {Promise<number>} Distance in km
   */
  async calculateDistance(pickupCoordinates, dropoffCoordinates) {
    try {
      if (!pickupCoordinates || !dropoffCoordinates) {
        console.warn('Missing location coordinates, using default distance');
        return 5; // Default 5km if coordinates missing
      }

      const distanceKm = await locationService.calculateDistance(
        pickupCoordinates,
        dropoffCoordinates
      );

      return Number(distanceKm) || 5;
    } catch (error) {
      console.error('Error calculating distance:', error);
      return 5; // Fallback distance
    }
  }

  /**
   * Calculates the estimated time for a trip.
   * @param {number} distanceKm 
   * @param {string} vehicleType 
   * @returns {string} Formatted time range (e.g., "15-25 min")
   */
  calculateEstimatedTime(distanceKm, vehicleType) {
    const rates = this.VEHICLE_RATES[vehicleType] || this.VEHICLE_RATES.boda;
    const averageSpeed = rates.averageSpeed;

    const baseTime = 10; // minutes for pickup/handling
    const travelTime = (distanceKm / averageSpeed) * 60;
    const totalTime = baseTime + travelTime;
    const minTime = Math.max(10, Math.round(totalTime * 0.8));
    const maxTime = Math.round(totalTime * 1.2);

    return `${minTime}-${maxTime} min`;
  }

  /**
   * Calculates full fare details.
   * @param {Object} params 
   * @param {Object} params.pickupCoordinates
   * @param {Object} params.dropoffCoordinates
   * @param {string} params.vehicleType
   * @param {string} params.packageSize
   * @returns {Promise<Object>} Fare details object
   */
  async calculateFare({ pickupCoordinates, dropoffCoordinates, vehicleType = 'boda', packageSize = 'small' }) {
    try {
      const distanceKm = await this.calculateDistance(pickupCoordinates, dropoffCoordinates);
      const vehicleRates = this.VEHICLE_RATES[vehicleType] || this.VEHICLE_RATES.boda;

      // Calculate base fare - covers first 3km
      let baseFare = vehicleRates.baseRate;

      // Calculate distance fare for any distance beyond 3km
      let distanceFare = 0;
      if (distanceKm > 3) {
        const additionalKm = distanceKm - 3;
        distanceFare = additionalKm * vehicleRates.perKm;
      }

      // Total fare before size multiplier
      let totalBeforeMultiplier = baseFare + distanceFare;
      totalBeforeMultiplier = Math.max(totalBeforeMultiplier, vehicleRates.minFare);

      // Apply package size multiplier
      const sizeMultiplier = this.SIZE_MULTIPLIERS[packageSize] || 1;

      // Calculate subtotal
      let subtotal = totalBeforeMultiplier * sizeMultiplier;
      subtotal = Math.round(subtotal / 100) * 100;

      // Calculate service fee
      const serviceFee = Math.round(subtotal * this.SERVICE_FEE_RATE);

      return {
        baseFare,
        distanceFare: Math.round(distanceFare * sizeMultiplier),
        packageSizeMultiplier: sizeMultiplier,
        subtotal,
        serviceFee,
        total: subtotal + serviceFee,
        distance: parseFloat(distanceKm.toFixed(1)),
        estimatedTime: this.calculateEstimatedTime(distanceKm, vehicleType),
      };
    } catch (error) {
      console.error('Error in FareService.calculateFare:', error);
      // Fallback to default pricing
      return {
        baseFare: 3500,
        distanceFare: 1500,
        packageSizeMultiplier: 1,
        subtotal: 5000,
        serviceFee: 750,
        total: 5750,
        distance: 5,
        estimatedTime: '20-30 min',
      };
    }
  }

  /**
   * Formats a price value with currency.
   * @param {number} price 
   * @returns {string} Formatted price (e.g., "TZS 5,000")
   */
  formatPrice(price) {
    if (price === undefined || price === null) return 'TZS 0';
    return `TZS ${price.toLocaleString()}`;
  }
}

const fareService = new FareService();
export default fareService;
