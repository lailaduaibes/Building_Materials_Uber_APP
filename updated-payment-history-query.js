/**
 * UPDATED PaymentHistoryScreen Query - Use this once payment fields are added to database
 * Replace the current query in PaymentHistoryScreen.tsx with this after running add-payment-fields-to-trip-requests.sql
 */

// Updated query for when payment fields exist in trip_requests
const { data: trips, error } = await supabase
  .from('trip_requests')
  .select(`
    id,
    quoted_price,
    payment_status,
    payment_method_id,
    paid_amount,
    payment_processed_at,
    payment_transaction_id,
    pickup_address,
    delivery_address,
    material_type,
    required_truck_type_id,
    payment_methods (
      id,
      type,
      last4,
      brand
    )
  `)
  .eq('customer_id', user.id)
  .not('payment_status', 'is', null)
  .order('payment_processed_at', { ascending: false });

// Updated transformation logic
const transformedTransactions: PaymentTransaction[] = trips?.map(trip => {
  const paymentMethod = trip.payment_methods;
  
  return {
    id: trip.id,
    tripId: trip.id,
    amount: trip.paid_amount || trip.quoted_price || 0,
    paymentMethodType: paymentMethod?.type || 'unknown',
    paymentMethodLast4: paymentMethod?.last4,
    status: trip.payment_status as any,
    transactionId: trip.payment_transaction_id,
    processedAt: trip.payment_processed_at || new Date().toISOString(),
    tripDetails: {
      pickupAddress: trip.pickup_address?.formatted_address || 'Unknown pickup',
      deliveryAddress: trip.delivery_address?.formatted_address || 'Unknown delivery',
      materialType: trip.material_type || 'Unknown material',
      truckType: 'Standard Truck',
    },
  };
}) || [];
