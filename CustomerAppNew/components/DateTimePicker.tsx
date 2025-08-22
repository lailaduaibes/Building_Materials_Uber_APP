/**
 * DateTimePicker component for scheduling pickups
 * Compatible with React Native without external dependencies
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../theme';

const { width } = Dimensions.get('window');

interface DateTimePickerProps {
  visible: boolean;
  value?: Date;
  onDateTimeChange: (date: Date) => void;
  onCancel: () => void;
  minimumDate?: Date;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  visible,
  value,
  onDateTimeChange,
  onCancel,
  minimumDate = new Date(),
}) => {
  const [selectedDate, setSelectedDate] = useState(value || new Date());
  const [mode, setMode] = useState<'date' | 'time'>('date');

  // Generate next 30 days
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Generate time slots (every 15 minutes from 6 AM to 10 PM)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = { hour, minute };
        slots.push(time);
      }
    }
    return slots;
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatTime = (hour: number, minute: number) => {
    const time = new Date();
    time.setHours(hour, minute);
    return time.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleDateSelect = (date: Date) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setSelectedDate(newDate);
    setMode('time');
  };

  const handleTimeSelect = (hour: number, minute: number) => {
    const newDate = new Date(selectedDate);
    newDate.setHours(hour, minute);
    setSelectedDate(newDate);
  };

  const handleConfirm = () => {
    onDateTimeChange(selectedDate);
  };

  const isDateDisabled = (date: Date) => {
    return date < minimumDate;
  };

  const isTimeDisabled = (hour: number, minute: number) => {
    const now = new Date();
    const timeDate = new Date(selectedDate);
    timeDate.setHours(hour, minute);
    
    // If it's today, disable past times
    if (selectedDate.toDateString() === now.toDateString()) {
      return timeDate <= now;
    }
    
    return false;
  };

  const renderDatePicker = () => (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerTitle}>Select Date</Text>
      <ScrollView style={styles.optionsList}>
        {generateDates().map((date, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dateOption,
              {
                backgroundColor: date.toDateString() === selectedDate.toDateString() 
                  ? Theme.colors.primary 
                  : 'transparent'
              },
              isDateDisabled(date) && styles.disabledOption,
            ]}
            onPress={() => handleDateSelect(date)}
            disabled={isDateDisabled(date)}
          >
            <Text style={[
              styles.dateOptionText,
              {
                color: date.toDateString() === selectedDate.toDateString() 
                  ? 'white' 
                  : isDateDisabled(date) 
                    ? Theme.colors.text.light 
                    : Theme.colors.text.primary
              }
            ]}>
              {formatDate(date)}
            </Text>
            <Text style={[
              styles.dateOptionSubtext,
              {
                color: date.toDateString() === selectedDate.toDateString() 
                  ? 'white' 
                  : isDateDisabled(date) 
                    ? Theme.colors.text.light 
                    : Theme.colors.text.secondary
              }
            ]}>
              {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTimePicker = () => (
    <View style={styles.pickerContainer}>
      <View style={styles.timeHeader}>
        <TouchableOpacity onPress={() => setMode('date')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.pickerTitle}>Select Time</Text>
        <View style={styles.spacer} />
      </View>
      
      <Text style={styles.selectedDateText}>
        {formatDate(selectedDate)}
      </Text>
      
      <ScrollView style={styles.optionsList}>
        {generateTimeSlots().map((slot, index) => {
          const isDisabled = isTimeDisabled(slot.hour, slot.minute);
          const isSelected = selectedDate.getHours() === slot.hour && 
                           selectedDate.getMinutes() === slot.minute;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.timeOption,
                {
                  backgroundColor: isSelected ? Theme.colors.primary : 'transparent'
                },
                isDisabled && styles.disabledOption,
              ]}
              onPress={() => handleTimeSelect(slot.hour, slot.minute)}
              disabled={isDisabled}
            >
              <Text style={[
                styles.timeOptionText,
                {
                  color: isSelected 
                    ? 'white' 
                    : isDisabled 
                      ? Theme.colors.text.light 
                      : Theme.colors.text.primary
                }
              ]}>
                {formatTime(slot.hour, slot.minute)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {mode === 'date' ? renderDatePicker() : renderTimePicker()}
          
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.confirmButton,
                { opacity: mode === 'time' ? 1 : 0.5 }
              ]} 
              onPress={handleConfirm}
              disabled={mode === 'date'}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  pickerContainer: {
    padding: 20,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  spacer: {
    width: 32,
  },
  selectedDateText: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsList: {
    maxHeight: 300,
  },
  dateOption: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  dateOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dateOptionSubtext: {
    fontSize: 14,
    marginTop: 2,
  },
  timeOption: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    alignItems: 'center',
  },
  timeOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  disabledOption: {
    opacity: 0.5,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: Theme.colors.text.primary,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
    padding: 16,
    marginLeft: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default DateTimePicker;
