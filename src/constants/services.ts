export const ENTITLEMENTS = {
    TS_SHOPPING: "15% off T Store Shopping",
    TS_SALON: "15% off TS Salon Services",
    WELLNESS_ALL: "15% off All Services @ No.1 Wellness",
    BREAKFAST: "Complimentary Breakfast",
    LATE_CHECKOUT: "Late Check-out (2pm)",
    WELCOME_DRINK: "Welcome Drink",
    FREE_YOGA: "1x Free Yoga Class",
    // Legacy mapping for backward compatibility
    OLD_WELLNESS: "15% off F&B No.1 Wellness",
} as const;

export const SERVICES_LIST = [
    ENTITLEMENTS.TS_SHOPPING,
    ENTITLEMENTS.TS_SALON,
    ENTITLEMENTS.WELLNESS_ALL,
    ENTITLEMENTS.BREAKFAST,
    ENTITLEMENTS.LATE_CHECKOUT,
    ENTITLEMENTS.WELCOME_DRINK,
    ENTITLEMENTS.FREE_YOGA
];

export const SERVICE_GROUPS = [
    {
        label: 'Massage & Spa (No.1 Wellness)',
        items: [
            { value: 'Signature Massage', label: 'No.1 Signature Massage' },
            { value: 'Slimming Massage', label: 'No.1 Slimming Massage' },
            { value: 'Lymphatic Massage', label: 'No.1 Lymphatic Massage' },
            { value: 'Relaxing Massage', label: 'No.1 Relaxing Massage' },
            { value: 'Guided Recovery Pilates', label: 'Guided Recovery Pilates' },
            { value: 'Stretching', label: 'Stretching Class' },
        ]
    },
    {
        label: 'IV Therapy',
        items: [
            { value: 'IV Immune Booster', label: 'IV Immune Booster' },
            { value: 'IV Recovery & Detox', label: 'IV Recovery & Detox' },
            { value: 'IV Hangover Cure', label: 'IV Hangover Cure' },
            { value: 'IV Bali Belly', label: 'IV Bali Belly Infusion' },
        ]
    },
    {
        label: 'TS Salon Services',
        items: [
            { value: 'Hair Cut', label: 'Hair Cut / Styling' },
            { value: 'Manicure/Pedicure', label: 'Manicure / Pedicure' },
            { value: 'Facial', label: 'Facial Treatment' },
            { value: 'Salon General', label: 'General Salon Service' },
        ]
    },
    {
        label: 'T Store Shopping',
        items: [
            { value: 'Apparel', label: 'Apparel / Clothing' },
            { value: 'Accessories', label: 'Accessories' },
            { value: 'T Store General', label: 'General Store Purchase' },
        ]
    },
    {
        label: 'Fitness & Wellness',
        items: [
            { value: 'Reformer Pilates', label: 'Reformer Pilates' },
            { value: 'Pilates Class', label: 'Mat Pilates Class' },
            { value: 'Guided Recovery Pilates', label: 'Guided Recovery Pilates' },
            { value: 'Zumba', label: 'Zumba Class' },
            { value: 'Kickboxing', label: 'Kickboxing' },
            { value: 'Muay Thai', label: 'Muay Thai' },
            { value: 'Stretching', label: 'Stretching Class' },
            { value: 'Sensual Flow', label: 'Sensual Flow' },
            { value: 'Private Session', label: 'Private Fitness Session' },
        ]
    },
    {
        label: 'Other',
        items: [
            { value: '15% off All Services @ No.1 (F&B, Classes, Massage, etc)', label: '15% off All Services @ No.1 (F&B, Classes, Massage, etc)' },
            { value: 'Food & Beverage', label: 'Standard Food & Beverage' },
            { value: 'Day Pass', label: 'Day Pass' },
        ]
    }
];
