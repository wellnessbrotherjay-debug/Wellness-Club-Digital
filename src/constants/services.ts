export const ENTITLEMENTS = {
    TS_SHOPPING: "15% off T Store Shopping",
    TS_SALON: "15% off TS Salon Services",
    WELLNESS_ALL: "15% off All Services @ No.1 (F&B, Classes, Massage, etc)",
    BREAKFAST: "Complimentary Breakfast",
    LATE_CHECKOUT: "Late Check-out (2pm)",
    WELCOME_DRINK: "Welcome Drink",
    FREE_YOGA: "1x Free Yoga Class",
    FACILITY_ACCESS: "Facility Access (Sauna, Hot & Cold Bath)",
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
    ENTITLEMENTS.FREE_YOGA,
    ENTITLEMENTS.FACILITY_ACCESS
];

export const SERVICE_GROUPS = [
    {
        label: 'Massage & Spa (No.1 Wellness)',
        items: [
            { value: 'Signature Massage', label: 'No.1 Signature Massage', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
            { value: 'Slimming Massage', label: 'No.1 Slimming Massage', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
            { value: 'Lymphatic Massage', label: 'No.1 Lymphatic Massage', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
            { value: 'Relaxing Massage', label: 'No.1 Relaxing Massage', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
        ]
    },
    {
        label: 'IV Therapy',
        items: [
            { value: 'IV Immune Booster', label: 'IV Immune Booster', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
            { value: 'IV Recovery & Detox', label: 'IV Recovery & Detox', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
            { value: 'IV Hangover Cure', label: 'IV Hangover Cure', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
            { value: 'IV Bali Belly', label: 'IV Bali Belly Infusion', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
        ]
    },
    {
        label: 'TS Salon Services',
        items: [
            { value: 'Hair Cut', label: 'Hair Cut / Styling', requiredEntitlement: ENTITLEMENTS.TS_SALON },
            { value: 'Manicure/Pedicure', label: 'Manicure / Pedicure', requiredEntitlement: ENTITLEMENTS.TS_SALON },
            { value: 'Facial', label: 'Facial Treatment', requiredEntitlement: ENTITLEMENTS.TS_SALON },
            { value: 'Salon General', label: 'General Salon Service', requiredEntitlement: ENTITLEMENTS.TS_SALON },
        ]
    },
    {
        label: 'T Store Shopping',
        items: [
            { value: 'Apparel', label: 'Apparel / Clothing', requiredEntitlement: ENTITLEMENTS.TS_SHOPPING },
            { value: 'Accessories', label: 'Accessories', requiredEntitlement: ENTITLEMENTS.TS_SHOPPING },
            { value: 'T Store General', label: 'General Store Purchase', requiredEntitlement: ENTITLEMENTS.TS_SHOPPING },
        ]
    },
    {
        label: 'Fitness & Wellness',
        items: [
            { value: '1x Free Yoga Class', label: '1x Free Yoga Class', requiredEntitlement: ENTITLEMENTS.FREE_YOGA },
            { value: 'Yoga Class', label: 'Regular Yoga Class', requiredEntitlement: ENTITLEMENTS.FREE_YOGA },
            { value: 'Reformer Pilates', label: 'Reformer Pilates', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
            { value: 'Pilates', label: 'Mat Pilates', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
            { value: 'Zumba', label: 'Zumba Class', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
            { value: 'Kickboxing', label: 'Kickboxing / Muay Thai', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
            { value: 'Stretching', label: 'Stretching Class', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
            { value: 'Sensual Flow', label: 'Sensual Flow', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
            { value: 'Private Session', label: 'Private Fitness Session', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
        ]
    },
    {
        label: 'Other',
        items: [
            { value: '15% off All Services @ No.1 (F&B, Classes, Massage, etc)', label: '15% off All Services @ No.1 (F&B, Classes, Massage, etc)', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
            { value: 'Food & Beverage', label: 'Standard Food & Beverage', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
            { value: 'Complimentary Breakfast', label: 'Complimentary Breakfast', requiredEntitlement: ENTITLEMENTS.BREAKFAST },
            { value: 'Welcome Drink', label: 'Welcome Drink', requiredEntitlement: ENTITLEMENTS.WELCOME_DRINK },
            { value: 'Day Pass', label: 'Day Pass (Facilities Only)', requiredEntitlement: ENTITLEMENTS.WELLNESS_ALL },
        ]
    }
];
