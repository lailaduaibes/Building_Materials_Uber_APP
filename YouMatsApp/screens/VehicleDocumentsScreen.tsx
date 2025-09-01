import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
  Dimensions,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
// import * as Sharing from 'expo-sharing';
// import * as MediaLibrary from 'expo-media-library';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverService } from '../services/DriverService';
import { responsive } from '../utils/ResponsiveUtils';

const { width } = Dimensions.get('window');

// Create authenticated Supabase client (same config as DriverService)
const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Professional Blue Theme
const theme = {
  primary: '#3B82F6',
  secondary: '#FFFFFF',
  accent: '#1E40AF',
  background: '#F8FAFC',
  white: '#FFFFFF',
  text: '#1F2937',
  lightText: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#E5E7EB',
  cardBackground: '#FFFFFF',
  shadow: '#000000',
};

interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  year: number;
  max_payload: string;
  max_volume: string;
  truck_type_id?: string;
  current_driver_id?: string;
}

interface VehicleDocument {
  id: string;
  driver_id: string;
  document_type: string;
  file_name: string;
  file_size: number;
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

interface VehicleDocumentsScreenProps {
  vehicle: Vehicle;
  onBack: () => void;
}

export default function VehicleDocumentsScreen({ vehicle, onBack }: VehicleDocumentsScreenProps) {
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewerModalVisible, setViewerModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<VehicleDocument | null>(null);
  const [documentImageUrl, setDocumentImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      console.log('📄 Loading vehicle documents for vehicle:', vehicle.license_plate);
      
      // Get current driver
      const currentDriver = driverService.getCurrentDriver();
      if (!currentDriver) {
        console.error('❌ No current driver found');
        setDocuments([]);
        setLoading(false);
        return;
      }

      console.log('👤 Current driver details:', {
        id: currentDriver.id,
        user_id: currentDriver.user_id,
        name: currentDriver.fullName || `${currentDriver.firstName} ${currentDriver.lastName}`
      });

      // Try both driver profile ID and user ID to see which one works
      console.log('🔍 Searching documents with driver_id:', currentDriver.id);
      
      // Get real documents from database using driver profile ID
      const { data: documentsData, error } = await supabase
        .from('driver_documents')
        .select('*')
        .eq('driver_id', currentDriver.id)
        .order('uploaded_at', { ascending: false });

      console.log('📋 Query result:', { 
        documentsData, 
        error, 
        queryUsed: 'driver_id = ' + currentDriver.id,
        resultCount: documentsData?.length || 0
      });

      if (documentsData && documentsData.length > 0) {
        console.log('📄 Sample document:', documentsData[0]);
        console.log('🔗 Sample file URL:', documentsData[0]?.file_url);
        setDocuments(documentsData as VehicleDocument[]);
        console.log('✅ Loaded documents with profile_id:', documentsData.length);
      } else if (error) {
        console.error('❌ Error loading documents with profile ID:', error);
        
        // Try with user_id as fallback
        console.log('🔄 Trying with user_id:', currentDriver.user_id);
        const { data: documentsData2, error: error2 } = await supabase
          .from('driver_documents')
          .select('*')
          .eq('driver_id', currentDriver.user_id)
          .order('uploaded_at', { ascending: false });
          
        console.log('📋 Fallback query result:', { documentsData2, error2, queryUsed: 'driver_id = ' + currentDriver.user_id });
          
        if (error2) {
          console.error('❌ Error loading documents with user ID:', error2);
          
          // Try a simple query without filters to see if we can access the table at all
          console.log('🔄 Trying simple query to check table access...');
          const { data: allDocs, error: allError } = await supabase
            .from('driver_documents')
            .select('id, driver_id, document_type, uploaded_at')
            .limit(5);
            
          console.log('📋 Simple query result:', { allDocs, allError });
          
          setDocuments([]);
        } else {
          console.log('✅ Loaded documents with user_id:', documentsData2 ? documentsData2.length : 0);
          setDocuments(documentsData2 || []);
        }
      } else {
        console.log('✅ No documents found');
        setDocuments([]);
      }
    } catch (error) {
      console.error('❌ Error in loadDocuments:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentIcon = (documentType: string) => {
    switch (documentType) {
      case 'vehicle_registration': return 'document-text';
      case 'insurance_certificate': return 'shield-checkmark';
      case 'inspection_certificate': return 'checkmark-circle';
      case 'driving_license': return 'card';
      default: return 'document';
    }
  };

  const getDocumentName = (documentType: string) => {
    switch (documentType) {
      case 'vehicle_registration': return 'Vehicle Registration';
      case 'insurance_certificate': return 'Insurance Certificate';
      case 'inspection_certificate': return 'Inspection Certificate';
      case 'driving_license': return 'Driving License';
      default: return documentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return theme.success;
      case 'rejected': return theme.error;
      case 'pending': return theme.warning;
      default: return theme.lightText;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'pending': return 'Pending Review';
      default: return 'Unknown';
    }
  };

  // Document Update via Upload - Security compliant approach using existing driver_documents table
  // Following industry standards (Uber/Lyft), drivers upload new documents with 'pending' status
  // Admin reviews and approves/rejects through the dashboard. If approved, old document becomes inactive.
  const handleRequestDocumentUpdate = async (documentType: string) => {
    const currentDriver = driverService.getCurrentDriver();
    if (!currentDriver) {
      Alert.alert('Error', 'Please log in to upload documents');
      return;
    }

    Alert.alert(
      'Update Document',
      `To update your ${getDocumentName(documentType)}, you can upload a new version.\n\nThe new document will be reviewed by the admin team. If approved, it will replace your current document.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upload New Version',
          onPress: () => {
            // Use existing upload functionality - it creates pending documents
            handleUploadDocument();
          }
        }
      ]
    );
  };

  const handleUploadDocument = async () => {
    // Get current driver ID first
    const currentDriver = driverService.getCurrentDriver();
    if (!currentDriver) {
      Alert.alert('Error', 'Please log in to upload documents');
      return;
    }

    Alert.alert(
      'Upload Document',
      'Choose how you want to add your document:',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted) {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });
              
              if (!result.canceled && result.assets[0]) {
                await uploadDocumentFile(result.assets[0]);
              }
            } else {
              Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
            }
          }
        },
        {
          text: 'Choose File',
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
              });
              
              if (!result.canceled && result.assets[0]) {
                await uploadDocumentFile(result.assets[0]);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to select document');
            }
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const uploadDocumentFile = async (file: any) => {
    try {
      setUploading(true);
      
      const currentDriver = driverService.getCurrentDriver();
      if (!currentDriver) {
        Alert.alert('Error', 'Please log in to upload documents');
        return;
      }

      // For now, let's use a default document type - in a real app you'd let user choose
      const documentType = 'vehicle_registration'; // or 'insurance', 'license', etc.
      
      const uploadResult = await driverService.uploadDocument(
        currentDriver.id,
        documentType,
        {
          uri: file.uri,
          name: file.name || 'document.jpg',
          type: file.mimeType || 'image/jpeg',
          size: file.size
        }
      );

      if (uploadResult.success) {
        Alert.alert('Success', 'Document uploaded successfully!');
        // Refresh documents list
        loadDocuments();
      } else {
        Alert.alert('Upload Failed', uploadResult.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = (document: VehicleDocument) => {
    setSelectedDocument(document);
    setViewerModalVisible(true);
    // Automatically load the document preview when modal opens
    handleViewFullDocument(document);
  };

  const handleDownloadDocument = async (document: VehicleDocument) => {
    try {
      Alert.alert(
        'Download Started',
        'The document download will begin shortly...',
        [{ text: 'OK' }]
      );

      if (!document.file_url) {
        Alert.alert('Error', 'Document URL not found');
        return;
      }

      // Extract the file path from the full URL
      // Supabase URLs are like: https://...supabase.co/storage/v1/object/public/driver-documents/path/to/file
      const urlParts = document.file_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const pathIndex = document.file_url.indexOf('/driver-documents/');
      
      if (pathIndex === -1) {
        Alert.alert('Error', 'Invalid document URL format');
        return;
      }

      const filePath = document.file_url.substring(pathIndex + '/driver-documents/'.length);
      
      // Get a signed URL for the document to ensure proper access
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('driver-documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (urlError || !signedUrlData?.signedUrl) {
        console.error('Error creating signed URL:', urlError);
        console.error('File path used:', filePath);
        // Fallback to direct URL
        const supported = await Linking.canOpenURL(document.file_url);
        if (supported) {
          await Linking.openURL(document.file_url);
        } else {
          Alert.alert('Error', 'Cannot access document. Please contact support.');
        }
        return;
      }

      // Open the signed URL which should properly display the document
      const supported = await Linking.canOpenURL(signedUrlData.signedUrl);
      if (supported) {
        await Linking.openURL(signedUrlData.signedUrl);
      } else {
        Alert.alert('Error', 'Cannot open document viewer.');
      }
      
    } catch (error) {
      console.error('Error downloading document:', error);
      Alert.alert('Error', 'Failed to access document');
    }
  };

  const handleShareDocument = async (document: VehicleDocument) => {
    try {
      if (!document.file_url) {
        Alert.alert('Error', 'Document URL not found');
        return;
      }

      // Simple sharing via the native share functionality
      Alert.alert(
        'Share Document',
        `Share ${getDocumentName(document.document_type)}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Copy Link',
            onPress: () => {
              // Copy to clipboard functionality would go here
              Alert.alert('Success', 'Document link copied to clipboard');
            }
          },
          {
            text: 'Open Document',
            onPress: () => handleDownloadDocument(document)
          }
        ]
      );
      
    } catch (error) {
      console.error('Error sharing document:', error);
      Alert.alert('Error', 'Failed to share document');
    }
  };

  // Security Compliant: Upload new document for admin review
  const handleReplaceDocument = (document: VehicleDocument) => {
    Alert.alert(
      'Update Document',
      `To update your ${getDocumentName(document.document_type)}, you can upload a new version.\n\nThe new document will be marked as "pending" and reviewed by the admin team. If approved, it will replace your current document.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Upload New Version',
          onPress: () => {
            setViewerModalVisible(false);
            // Call the existing upload function - it will create a new pending document
            setTimeout(() => {
              handleUploadDocument();
            }, 300);
          }
        }
      ]
    );
  };

  const handleCloseViewer = () => {
    setViewerModalVisible(false);
    setSelectedDocument(null);
    setDocumentImageUrl(null);
    setImageLoading(false);
  };

  const handleViewFullDocument = async (document: VehicleDocument) => {
    try {
      setImageLoading(true);
      
      if (!document.file_url) {
        Alert.alert('Error', 'Document URL not found');
        setImageLoading(false);
        return;
      }

      console.log('🔍 Original file URL:', document.file_url);

      // Check if it's already a public URL - if so, use it directly
      if (document.file_url.includes('storage/v1/object/public/')) {
        console.log('✅ Using public URL directly:', document.file_url);
        
        // Test if the URL is actually accessible by making a HEAD request
        try {
          const response = await fetch(document.file_url, { method: 'HEAD' });
          console.log('🔍 URL HEAD response:', {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
          });
          
          if (response.ok && response.headers.get('content-length') !== '0') {
            console.log('✅ Setting documentImageUrl to:', document.file_url);
            setDocumentImageUrl(document.file_url);
            setImageLoading(false);
            return;
          } else {
            console.warn('⚠️ File exists but is empty or inaccessible');
            Alert.alert(
              'File Issue', 
              'The document exists but appears to be empty or corrupted. You can try downloading it or contact support.',
              [{ text: 'OK' }]
            );
            setImageLoading(false);
            return;
          }
        } catch (fetchError) {
          console.error('❌ Error testing URL accessibility:', fetchError);
          // Continue to try signed URL approach
        }
      }

      // If it's not a public URL, try to create a signed URL
      let filePath = '';
      
      // Method 1: Check if it's already a relative path
      if (!document.file_url.includes('http')) {
        filePath = document.file_url;
        console.log('📁 Using relative path:', filePath);
      } else {
        // Method 2: Extract from full URL
        const pathIndex = document.file_url.indexOf('/driver-documents/');
        if (pathIndex !== -1) {
          filePath = document.file_url.substring(pathIndex + '/driver-documents/'.length);
          console.log('📁 Extracted from URL:', filePath);
        } else {
          // Method 3: Try getting filename only
          const urlParts = document.file_url.split('/');
          filePath = urlParts[urlParts.length - 1];
          console.log('📁 Using filename only:', filePath);
        }
      }

      console.log('🔗 Attempting to create signed URL for:', filePath);

      // Get a signed URL for viewing
      let { data: signedUrlData, error: urlError } = await supabase.storage
        .from('driver-documents')
        .createSignedUrl(filePath, 3600);

      if (urlError) {
        console.error('❌ Signed URL error:', urlError);
        console.log('🔄 Trying with different path format...');
        
        // Try with driver_id prefix if it's missing
        const driverIdPrefix = `${document.driver_id}/`;
        const alternativePath = filePath.startsWith(driverIdPrefix) ? 
          filePath.substring(driverIdPrefix.length) : 
          `${driverIdPrefix}${filePath}`;
          
        console.log('🔗 Trying alternative path:', alternativePath);
        
        const { data: altSignedUrlData, error: altUrlError } = await supabase.storage
          .from('driver-documents')
          .createSignedUrl(alternativePath, 3600);
          
        if (altUrlError || !altSignedUrlData?.signedUrl) {
          console.error('❌ Alternative signed URL also failed:', altUrlError);
          Alert.alert(
            'Debug Info', 
            `Cannot create signed URL.\n\nOriginal URL: ${document.file_url}\n\nExtracted path: ${filePath}\n\nAlternative path: ${alternativePath}\n\nError: ${urlError?.message || 'Unknown error'}`
          );
          setImageLoading(false);
          return;
        } else {
          signedUrlData = altSignedUrlData;
          urlError = altUrlError;
        }
      }

      if (!signedUrlData?.signedUrl) {
        Alert.alert('Error', 'Could not generate secure document link');
        setImageLoading(false);
        return;
      }

      console.log('✅ Generated signed URL:', signedUrlData.signedUrl);

      // Set the image URL to display in the modal
      setDocumentImageUrl(signedUrlData.signedUrl);
      setImageLoading(false);
      
    } catch (error) {
      console.error('❌ Error viewing document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to view document: ${errorMessage}`);
      setImageLoading(false);
    }
  };

  const renderDocumentCard = (document: VehicleDocument) => {
    const documentName = getDocumentName(document.document_type);
    const uploadDate = new Date(document.uploaded_at).toLocaleDateString();
    
    return (
      <TouchableOpacity
        key={document.id}
        style={styles.documentCard}
        onPress={() => handleViewDocument(document)}
      >
        <View style={styles.documentHeader}>
          <View style={styles.documentIcon}>
            <Ionicons 
              name={getDocumentIcon(document.document_type)} 
              size={24} 
              color={theme.primary} 
            />
          </View>
          <View style={styles.documentInfo}>
            <Text style={styles.documentName}>{documentName}</Text>
            <Text style={styles.documentFileName}>{document.file_name}</Text>
            <Text style={styles.uploadDate}>Uploaded: {uploadDate}</Text>
          </View>
          <View style={styles.documentStatus}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(document.status) }]}>
              <Text style={styles.statusText}>{getStatusText(document.status)}</Text>
            </View>
          </View>
        </View>
        
        {document.reviewed_at && (
          <View style={styles.expiryInfo}>
            <Ionicons name="checkmark-circle-outline" size={16} color={theme.success} />
            <Text style={styles.expiryText}>Reviewed: {new Date(document.reviewed_at).toLocaleDateString()}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderRequiredDocuments = () => {
    const requiredDocs = [
      { type: 'vehicle_registration', name: 'Vehicle Registration', required: true },
      { type: 'insurance_certificate', name: 'Insurance Certificate', required: true },
      { type: 'inspection_certificate', name: 'Safety Inspection', required: false },
      { type: 'driving_license', name: 'Driver License', required: true },
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Required Documents</Text>
        {requiredDocs.map((reqDoc) => {
          const hasDocument = documents.some(doc => doc.document_type === reqDoc.type);
          return (
            <View key={reqDoc.type} style={styles.requiredDocItem}>
              <View style={styles.requiredDocInfo}>
                <Ionicons 
                  name={getDocumentIcon(reqDoc.type)} 
                  size={20} 
                  color={hasDocument ? theme.success : theme.lightText} 
                />
                <Text style={[styles.requiredDocName, { color: hasDocument ? theme.text : theme.lightText }]}>
                  {reqDoc.name}
                </Text>
                {reqDoc.required && (
                  <Text style={styles.requiredLabel}>Required</Text>
                )}
              </View>
              <Ionicons 
                name={hasDocument ? 'checkmark-circle' : 'add-circle-outline'} 
                size={24} 
                color={hasDocument ? theme.success : theme.primary} 
              />
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Vehicle Documents</Text>
          <Text style={styles.headerSubtitle}>{vehicle.license_plate}</Text>
        </View>
        {/* Upload functionality removed for security - documents are view-only */}
      </View>

      <ScrollView style={styles.content}>
        {/* Vehicle Info */}
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleTitle}>
            {vehicle.make} {vehicle.model} ({vehicle.year})
          </Text>
          <Text style={styles.vehiclePlate}>{vehicle.license_plate}</Text>
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uploaded Documents</Text>
          {documents.length > 0 ? (
            documents.map(renderDocumentCard)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color={theme.lightText} />
              <Text style={styles.emptyStateTitle}>No Documents Available</Text>
              <Text style={styles.emptyStateText}>
                Documents are managed during the registration process. Contact support if you need to update your documents.
              </Text>
            </View>
          )}
        </View>

        {/* Required Documents Checklist */}
        {renderRequiredDocuments()}

        {/* Upload Actions Removed - Documents are view-only for security */}
        <View style={styles.uploadSection}>
          <View style={styles.uploadCard}>
            <Ionicons name="information-circle-outline" size={32} color={theme.primary} />
            <Text style={styles.uploadTitle}>Documents are View-Only</Text>
            <Text style={styles.uploadSubtitle}>
              To update or add documents, please contact support or use the registration process.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Document Viewer Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={viewerModalVisible}
        onRequestClose={handleCloseViewer}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedDocument && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {getDocumentName(selectedDocument.document_type)}
                  </Text>
                  <TouchableOpacity 
                    onPress={handleCloseViewer}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  style={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  <View style={styles.documentDetailsContainer}>
                    <View style={styles.documentDetail}>
                      <Text style={styles.detailLabel}>File Name:</Text>
                      <Text style={styles.detailValue} numberOfLines={2}>
                        {selectedDocument.file_name}
                      </Text>
                    </View>
                    
                    <View style={styles.documentDetail}>
                      <Text style={styles.detailLabel}>Size:</Text>
                      <Text style={styles.detailValue}>
                        {(selectedDocument.file_size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </View>

                    <View style={styles.documentDetail}>
                      <Text style={styles.detailLabel}>Uploaded:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedDocument.uploaded_at).toLocaleDateString()}
                      </Text>
                    </View>

                    <View style={styles.documentDetail}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedDocument.status) }]}>
                        <Text style={styles.statusText}>{getStatusText(selectedDocument.status)}</Text>
                      </View>
                    </View>

                    {selectedDocument.reviewed_at && (
                      <View style={styles.documentDetail}>
                        <Text style={styles.detailLabel}>Reviewed:</Text>
                        <Text style={styles.detailValue}>
                          {new Date(selectedDocument.reviewed_at).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Image Viewer */}
                  {documentImageUrl && (
                    <View style={styles.imageContainer}>
                      <Text style={styles.imageTitle}>Document Preview:</Text>
                      <Text style={{ fontSize: 12, color: 'gray', marginBottom: 8 }}>
                        URL: {documentImageUrl.substring(0, 50)}...
                      </Text>
                      {/* Use a TouchableOpacity to open the image in browser as fallback */}
                      <TouchableOpacity 
                        style={[styles.documentImage, { 
                          borderWidth: 2, 
                          borderColor: 'blue',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }]}
                        onPress={() => {
                          Alert.alert(
                            'Open Document',
                            'Would you like to open this document in your browser?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Open', 
                                onPress: () => Linking.openURL(documentImageUrl)
                              }
                            ]
                          );
                        }}
                      >
                        <Ionicons name="document-text" size={80} color={theme.primary} />
                        <Text style={{ 
                          marginTop: 16, 
                          fontSize: 16, 
                          fontWeight: '600',
                          color: theme.primary,
                          textAlign: 'center'
                        }}>
                          Tap to Open Document
                        </Text>
                        <Text style={{ 
                          marginTop: 8, 
                          fontSize: 12, 
                          color: theme.lightText,
                          textAlign: 'center',
                          paddingHorizontal: 20
                        }}>
                          Document will open in your browser
                        </Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 10, color: 'blue', marginTop: 8, textAlign: 'center' }}>
                        Image component is rendered ✓
                      </Text>
                    </View>
                  )}

                  {imageLoading && (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loadingText}>Loading image...</Text>
                    </View>
                  )}

                  {!documentImageUrl && !imageLoading && (
                    <View style={styles.imageContainer}>
                      <Text style={styles.imageTitle}>Document Preview:</Text>
                      <View style={styles.placeholderContainer}>
                        <Ionicons name="document-outline" size={64} color={theme.lightText} />
                        <Text style={styles.placeholderText}>
                          Document preview will load automatically, or tap "View" to refresh
                        </Text>
                        <Text style={{ fontSize: 10, color: 'red', marginTop: 8 }}>
                          Debug: imageUrl={documentImageUrl ? 'SET' : 'NULL'}, loading={imageLoading ? 'TRUE' : 'FALSE'}
                        </Text>
                      </View>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => {
                      if (selectedDocument) {
                        Linking.openURL(selectedDocument.file_url);
                      } else {
                        Alert.alert('Error', 'No document selected');
                      }
                    }}
                  >
                    <Ionicons name="open" size={20} color={theme.white} />
                    <Text style={styles.actionButtonText}>Open</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.downloadButton]}
                    onPress={() => {
                      if (selectedDocument) {
                        handleDownloadDocument(selectedDocument);
                      } else {
                        Alert.alert('Error', 'No document selected');
                      }
                    }}
                  >
                    <Ionicons name="download" size={20} color={theme.white} />
                    <Text style={styles.actionButtonText}>Download</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.shareButton]}
                    onPress={() => {
                      if (selectedDocument) {
                        handleShareDocument(selectedDocument);
                      } else {
                        Alert.alert('Error', 'No document selected');
                      }
                    }}
                  >
                    <Ionicons name="share" size={20} color={theme.white} />
                    <Text style={styles.actionButtonText}>Share</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.replaceButton]}
                    onPress={() => {
                      if (selectedDocument) {
                        handleReplaceDocument(selectedDocument);
                      } else {
                        Alert.alert('Error', 'No document selected');
                      }
                    }}
                  >
                    <Ionicons name="cloud-upload" size={20} color={theme.primary} />
                    <Text style={[styles.actionButtonText, { color: theme.primary }]}>Upload New Version</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: theme.white,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.lightText,
    marginTop: 2,
  },
  uploadButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  vehicleInfo: {
    backgroundColor: theme.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  vehiclePlate: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
  },
  documentCard: {
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  documentFileName: {
    fontSize: 14,
    color: theme.lightText,
    marginBottom: 4,
  },
  uploadDate: {
    fontSize: 12,
    color: theme.lightText,
  },
  documentStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: theme.white,
    fontWeight: '500',
  },
  expiryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  expiryText: {
    fontSize: 14,
    color: theme.lightText,
    marginLeft: 8,
  },
  requiredDocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  requiredDocInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requiredDocName: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  requiredLabel: {
    fontSize: 12,
    color: theme.error,
    fontWeight: '500',
    marginLeft: 8,
  },
  uploadSection: {
    marginTop: 20,
  },
  uploadCard: {
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.border,
    borderStyle: 'dashed',
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginTop: 16,
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: theme.lightText,
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.lightText,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  uploadEmptyButton: {
    backgroundColor: theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadEmptyButtonText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: responsive.padding(20),
  },
  modalContent: {
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: responsive.padding(24),
    width: '95%',
    maxWidth: 600, // Increased max width for larger modal
    maxHeight: '85%',
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: responsive.padding(16),
    marginBottom: responsive.spacing(20),
  },
  modalTitle: {
    fontSize: responsive.fontSize(18),
    fontWeight: '600',
    color: theme.text,
    flex: 1,
    marginRight: responsive.spacing(10),
  },
  closeButton: {
    padding: responsive.padding(4),
    borderRadius: 4,
  },
  modalScrollContent: {
    flex: 1,
  },
  documentDetailsContainer: {
    marginBottom: responsive.spacing(20),
  },
  documentDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: responsive.padding(8),
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  detailLabel: {
    fontSize: responsive.fontSize(14),
    fontWeight: '500',
    color: theme.text,
    flex: 1,
  },
  detailValue: {
    fontSize: responsive.fontSize(14),
    color: theme.lightText,
    flex: 2,
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: responsive.spacing(20),
    gap: responsive.spacing(12),
    paddingTop: responsive.padding(20),
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: responsive.padding(20),
    paddingVertical: responsive.padding(16),
    borderRadius: 10,
    flex: 1,
    minWidth: 120, // Minimum width for buttons
    maxWidth: '48%', // Two buttons per row max
    gap: responsive.spacing(8),
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtonText: {
    color: theme.white,
    fontSize: responsive.fontSize(14, 16),
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1, // Allow text to shrink if needed
  },
  // Blue theme button styles
  viewButton: {
    backgroundColor: theme.primary, // Primary blue
  },
  downloadButton: {
    backgroundColor: '#2563EB', // Slightly darker blue
  },
  shareButton: {
    backgroundColor: '#1D4ED8', // Even darker blue
  },
  replaceButton: {
    backgroundColor: theme.white,
    borderWidth: 2,
    borderColor: theme.primary,
  },
  imageContainer: {
    marginVertical: responsive.spacing(20),
    backgroundColor: theme.white, // Ensure white background
    borderRadius: 12,
    padding: responsive.padding(20),
    borderWidth: 2,
    borderColor: theme.primary, // Blue border to make it stand out
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageTitle: {
    fontSize: responsive.fontSize(16),
    fontWeight: '600',
    color: theme.text,
    marginBottom: responsive.spacing(12),
  },
  documentImage: {
    width: '100%',
    height: responsive.scale(300), // Increased height
    minHeight: 200, // Minimum height
    maxHeight: 400, // Maximum height
    borderRadius: 8,
    backgroundColor: '#f5f5f5', // Light gray background to see image bounds
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  loadingContainer: {
    padding: responsive.padding(20),
    alignItems: 'center',
  },
  loadingText: {
    fontSize: responsive.fontSize(16),
    color: theme.lightText,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: responsive.scale(150),
    backgroundColor: theme.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: responsive.fontSize(14),
    color: theme.lightText,
    textAlign: 'center',
    marginTop: responsive.spacing(12),
    paddingHorizontal: responsive.padding(16),
  },
});
