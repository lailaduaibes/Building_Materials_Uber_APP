// Simple Profile Photo Update Service for Driver App
// Allows direct profile photo updates without admin approval

import { createClient } from '@supabase/supabase-js';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

// Use same Supabase config as other services
const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.h2kH-x7zlR_6xBJAhCE8kydCKpRs-xCEhzwJhNWb-ag';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface ProfilePhotoUpdateResult {
  success: boolean;
  message: string;
  imageUrl?: string;
}

class ProfilePhotoUpdateService {
  
  // Simple direct profile photo update with camera/gallery options
  async updateProfilePhoto(driverId: string, userId: string): Promise<ProfilePhotoUpdateResult> {
    try {
      return new Promise((resolve) => {
        Alert.alert(
          'Update Profile Photo',
          'Choose how you want to update your profile photo',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve({ success: false, message: 'Update cancelled' })
            },
            {
              text: 'Camera',
              onPress: async () => {
                try {
                  await this.handleCameraPhoto(driverId, resolve);
                } catch (error) {
                  console.error('Camera error:', error);
                  resolve({ success: false, message: 'Camera access failed' });
                }
              }
            },
            {
              text: 'Gallery',
              onPress: async () => {
                try {
                  await this.handleGalleryPhoto(driverId, resolve);
                } catch (error) {
                  console.error('Gallery error:', error);
                  resolve({ success: false, message: 'Gallery access failed' });
                }
              }
            }
          ]
        );
      });
    } catch (error) {
      console.error('Error in updateProfilePhoto:', error);
      return {
        success: false,
        message: 'An error occurred. Please try again.'
      };
    }
  }

  // Handle camera photo capture
  private async handleCameraPhoto(driverId: string, resolve: (result: ProfilePhotoUpdateResult) => void) {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      resolve({ success: false, message: 'Camera permission is required' });
      return;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for profile photos
      quality: 0.8,
    });

    if (result.canceled) {
      resolve({ success: false, message: 'Photo capture cancelled' });
      return;
    }

    await this.processAndUploadImage(result.assets[0], driverId, resolve);
  }

  // Handle gallery photo selection
  private async handleGalleryPhoto(driverId: string, resolve: (result: ProfilePhotoUpdateResult) => void) {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      resolve({ success: false, message: 'Gallery permission is required' });
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for profile photos
      quality: 0.8,
    });

    if (result.canceled) {
      resolve({ success: false, message: 'Photo selection cancelled' });
      return;
    }

    await this.processAndUploadImage(result.assets[0], driverId, resolve);
  }

  // Process and upload the selected/captured image
  private async processAndUploadImage(
    asset: ImagePicker.ImagePickerAsset, 
    driverId: string, 
    resolve: (result: ProfilePhotoUpdateResult) => void
  ) {
    try {
      // Validate file size (5MB limit)
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        resolve({ success: false, message: 'Photo must be smaller than 5MB' });
        return;
      }

      // Upload directly to driver-photos bucket
      const fileExt = asset.uri.split('.').pop() || 'jpg';
      const fileName = `${driverId}_profile_${Date.now()}.${fileExt}`;
      
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: fileName,
      } as any);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('driver-documents')
        .upload(`profile-photos/${fileName}`, formData, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        resolve({ success: false, message: 'Failed to upload photo' });
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('driver-documents')
        .getPublicUrl(`profile-photos/${fileName}`);

      const imageUrl = urlData.publicUrl;

      // Update driver_profiles table directly
      const { error: updateError } = await supabase
        .from('driver_profiles')
        .update({ 
          profile_image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', driverId);

      if (updateError) {
        console.error('Database update error:', updateError);
        resolve({ success: false, message: 'Failed to update profile' });
        return;
      }

      resolve({
        success: true,
        message: 'Profile photo updated successfully!',
        imageUrl: imageUrl
      });

    } catch (error) {
      console.error('Error processing image:', error);
      resolve({
        success: false,
        message: 'Failed to process photo. Please try again.'
      });
    }
  }

  // Get current profile photo
  async getCurrentProfilePhoto(driverId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('profile_image_url')
        .eq('id', driverId)
        .single();

      if (error) {
        console.error('Error getting profile photo:', error);
        return null;
      }

      return data?.profile_image_url || null;
    } catch (error) {
      console.error('Error getting profile photo:', error);
      return null;
    }
  }
}

export const profilePhotoUpdateService = new ProfilePhotoUpdateService();
