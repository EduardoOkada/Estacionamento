const pricing = Object.freeze({
  baseParkingCents: 1800,
  serviceFeeCents: 250,
  additionalHourCents: 800,
  minimumHours: 1,
  maximumHours: 12,
  calculate(hours) {
    if (!Number.isInteger(hours) || hours < this.minimumHours || hours > this.maximumHours) {
      throw new RangeError(`A duração deve estar entre ${this.minimumHours} e ${this.maximumHours} horas.`);
    }

    const additionalHours = Math.max(0, hours - 1);
    return {
      hours,
      baseParkingCents: this.baseParkingCents,
      serviceFeeCents: this.serviceFeeCents,
      additionalHours,
      additionalHourCents: this.additionalHourCents,
      additionalHoursCents: additionalHours * this.additionalHourCents,
      totalCents: this.baseParkingCents + this.serviceFeeCents + additionalHours * this.additionalHourCents,
    };
  },
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = pricing;
}

if (typeof window !== 'undefined') {
  window.ParkingPricing = pricing;
}
