// Analytics tracking utilities

export const trackBooking = (serviceName: string, source: string) => {
    // Log booking event (can be extended with Google Analytics, etc.)
    console.log(`Booking tracked: ${serviceName} from ${source}`);

    // Example: Send to Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'booking_initiated', {
            service_name: serviceName,
            source: source
        });
    }
};

export const trackOutboundLink = (url: string, category: string, label: string) => {
    // Log outbound link click
    console.log(`Outbound link tracked: ${url} (${category}: ${label})`);

    // Example: Send to Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'click', {
            event_category: category,
            event_label: label,
            value: url
        });
    }
};
