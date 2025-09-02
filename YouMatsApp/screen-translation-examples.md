# Screen Translation Implementation Examples

## 1. EarningsScreen.tsx
```typescript
import { useLanguage } from '../contexts/LanguageContext';

export default function EarningsScreen() {
  const { t } = useLanguage();
  
  return (
    <View>
      <Text>{t('earnings.loading_earnings')}</Text>
      <Text>{t('earnings.total_earnings')}</Text>
      <Text>{t('earnings.avg_trip')}</Text>
      <Text>{t('earnings.todays_earnings')}</Text>
    </View>
  );
}
```

## 2. TripHistoryScreen.tsx
```typescript
import { useLanguage } from '../contexts/LanguageContext';

export default function TripHistoryScreen() {
  const { t } = useLanguage();
  
  return (
    <View>
      <Text>{t('trips.trip_history')}</Text>
      <Text>{t('trips.recent_trips')}</Text>
      <TextInput placeholder={t('trips.search_trips')} />
    </View>
  );
}
```

## 3. LiveTripTrackingScreen.tsx
```typescript
import { useLanguage } from '../contexts/LanguageContext';

export default function LiveTripTrackingScreen() {
  const { t } = useLanguage();
  
  return (
    <View>
      <Text>{t('trips.initializing_trip_tracking')}</Text>
      <Text>{t('common.status')} {status}</Text>
      <Text>{t('common.eta')} {eta}</Text>
      <Button title={t('navigation.navigate')} />
      <Button title={t('common.call_customer')} />
    </View>
  );
}
```

## 4. OrderAssignmentScreen.tsx
```typescript
import { useLanguage } from '../contexts/LanguageContext';

export default function OrderAssignmentScreen() {
  const { t } = useLanguage();
  
  return (
    <View>
      <Text>{t('orders.new_order')}</Text>
      <Text>{t('orders.order_details')}</Text>
      <Text>{t('orders.estimated_earnings')}</Text>
      <Button title={t('common.accept')} />
      <Button title={t('common.decline')} />
    </View>
  );
}
```

## 5. Bottom Navigation Translation
```typescript
// In your tab navigator configuration
const tabScreens = [
  {
    name: 'Earnings',
    component: EarningsScreen,
    title: t('earnings.title'),
    icon: 'wallet'
  },
  {
    name: 'MyTrips', 
    component: TripHistoryScreen,
    title: t('trips.trip_history'),
    icon: 'truck'
  },
  {
    name: 'Available',
    component: OrderAssignmentScreen, 
    title: t('common.available'),
    icon: 'list'
  },
  {
    name: 'Profile',
    component: DriverProfileScreen,
    title: t('profile.title'),
    icon: 'person'
  }
];
```

## Priority Implementation Order:
1. **High Priority**: EarningsScreen, TripHistoryScreen, LiveTripTrackingScreen
2. **Medium Priority**: OrderAssignmentScreen, Bottom Navigation
3. **Low Priority**: Settings screens, Help screens

## Key Translation Categories Created:
- `earnings` - All earnings-related text
- `trips` - Trip history, tracking, and management  
- `orders` - Order assignment and ASAP requests
- `navigation` - Route optimization and GPS navigation
- `dashboard` - Main dashboard elements and status
- `profile` - Driver profile and vehicle information
- `support` - Help and support functionality
- `common` - Shared UI elements and actions
